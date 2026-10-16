// Generic soundness gates that do not depend on the submitter's own negative vectors.
//
// 1. Public-input binding (verdict gate). An entry declares where its claimed public inputs
//    live (Implementation.publicInputs: input index + push index in the valid run, optionally a
//    byte offset + fixed-width encoding for a field packed inside a larger push). The harness
//    re-encodes those slots with other values (+1, -1, 0, swapped, and the n + r alias) and
//    the whole transaction must reject. Mutations that keep the encoded length are preferred
//    so a rejection cannot come from a shifted layout instead of the binding. This is a
//    necessary condition only: a verifier can reject a naive mutation and still be forgeable
//    (see the maintainer red-team gate for adaptive attacks).
//
// 2. Layout malleability (review flag, not a verdict). For intra-tx entries, every all-zero
//    pad push is lengthened by 32 attacker-chosen bytes. If the input carrying it still
//    accepts but a sibling that accepted before now rejects, that sibling depends on the
//    padded input's byte layout past a push of free length: it reads at a fixed offset, or it
//    hashes or compares the whole unlocking. The first is the pad-shift forgery class (a
//    sibling can be fed bytes the input itself never used); the second is safe. The harness
//    cannot tell them apart, so a dependency is reported for review.
import { decodeAuthenticationInstructions, encodeDataPush, encodeAuthenticationInstruction, bigIntToVmNumber, vmNumberToBigInt } from '@bitauth/libauth';

import type { Implementation, Scenario, Step } from './types.js';
import { evaluatePair, type Bch2026Vm } from './vm.js';

export const BN254_R = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const BLS12381_R = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

type Instr = ReturnType<typeof decodeAuthenticationInstructions>[number];
const dataOf = (i: Instr): Uint8Array | undefined => ('data' in i ? (i as any).data : undefined);
const encodeAll = (ins: Instr[]) => {
  const parts = ins.map((i) => encodeAuthenticationInstruction(i));
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const numberPush = (n: bigint): Instr => decodeAuthenticationInstructions(encodeDataPush(bigIntToVmNumber(n)))[0]!;
const valueOf = (i: Instr): bigint | undefined => {
  if (i.opcode === 0) return 0n;
  if (i.opcode >= 0x51 && i.opcode <= 0x60) return BigInt(i.opcode - 0x50);
  const d = dataOf(i);
  if (d === undefined) return undefined;
  const v = vmNumberToBigInt(d, { requireMinimalEncoding: false });
  return typeof v === 'bigint' ? v : undefined;
};

/** The valid run with some inputs' unlockings replaced (intra-tx aware). */
const withUnlockings = (valid: Step[], replace: Map<number, Uint8Array>): Step[] => {
  const unlockings = valid.map((s, i) => replace.get(i) ?? s.unlockingBytecode);
  if (valid.every((s) => s.intraTx !== undefined)) {
    const inputs = valid.map((s, i) => ({ ...s.intraTx!.inputs[i]!, unlockingBytecode: unlockings[i]! }));
    return valid.map((s, i) => ({ ...s, unlockingBytecode: unlockings[i]!, intraTx: { index: i, inputs } }));
  }
  if (valid.some((s) => s.grouped !== undefined)) {
    // grouped (token-carrying) txs: every step of a group sees the group's inputs, so a
    // replaced unlocking must reach its siblings' contexts too
    const groupInputs = new Map<number, { lockingBytecode: Uint8Array; unlockingBytecode: Uint8Array }[]>();
    valid.forEach((s) => { if (s.grouped && !groupInputs.has(s.grouped.group)) groupInputs.set(s.grouped.group, s.grouped.inputs.map((x) => ({ ...x }))); });
    valid.forEach((s, i) => { if (s.grouped) groupInputs.get(s.grouped.group)![s.grouped.index]!.unlockingBytecode = unlockings[i]!; });
    return valid.map((s, i) => ({ ...s, unlockingBytecode: unlockings[i]!, ...(s.grouped ? { grouped: { ...s.grouped, inputs: groupInputs.get(s.grouped.group)! } } : {}) }));
  }
  return valid.map((s, i) => ({ ...s, unlockingBytecode: unlockings[i]! }));
};
const accepts = (vm: Bch2026Vm, s: Step, bsv: boolean) => {
  const o = evaluatePair(vm, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped);
  return bsv ? o.bsvAccepted : o.accepted;
};

type Slot = { input: number; push: number; name?: string; offset?: number; encoding?: FieldEncoding };
export type FieldEncoding = 'le32' | 'be32' | 'le48' | 'be48';
const widthOf = (e: FieldEncoding) => (e.endsWith('48') ? 48 : 32);
const readField = (d: Uint8Array, offset: number, e: FieldEncoding): bigint => {
  const b = Buffer.from(d.subarray(offset, offset + widthOf(e)));
  return BigInt('0x' + (e.startsWith('le') ? b.reverse() : b).toString('hex'));
};
const writeField = (d: Uint8Array, offset: number, e: FieldEncoding, v: bigint): Uint8Array | undefined => {
  const w = widthOf(e);
  if (v < 0n || v >= 1n << BigInt(8 * w)) return undefined; // does not fit the field
  const b = Buffer.from(v.toString(16).padStart(2 * w, '0'), 'hex');
  const out = Uint8Array.from(d); out.set(e.startsWith('le') ? b.reverse() : b, offset);
  return out;
};

export interface PublicInputResult {
  declared: boolean;
  tested: number;
  accepted: number;
  firstAccepted?: string;
  /** mutations skipped because the value does not fit a fixed-width packed field */
  skipped?: number;
}

export const publicInputGate = (vm: Bch2026Vm, impl: Implementation, scenario: Scenario, bsv: boolean): PublicInputResult => {
  const decl = impl.publicInputs;
  if (decl === undefined || decl.length === 0) return { declared: false, tested: 0, accepted: 0 };
  const valid = scenario.valid;
  const r = impl.field === 'BLS12-381' ? BLS12381_R : BN254_R;
  const decoded = new Map<number, Instr[]>();
  const instrOf = (input: number) => decoded.get(input) ?? decoded.set(input, decodeAuthenticationInstructions(valid[input]!.unlockingBytecode)).get(input)!;
  // slots sharing a name are copies of one public input (a real claim changes all of them)
  const groups = new Map<string, Slot[]>();
  decl.forEach((d) => { const k = d.name ?? `input${d.input}/push${d.push}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(d); });
  const names = [...groups.keys()];
  const slotValue = (d: Slot): bigint | undefined => {
    const ins = instrOf(d.input)[d.push];
    if (ins === undefined) return undefined;
    if (d.offset === undefined) return valueOf(ins);
    const data = dataOf(ins);
    return data === undefined || data.length < d.offset + widthOf(d.encoding ?? 'le32') ? undefined : readField(data, d.offset, d.encoding ?? 'le32');
  };
  const truth = names.map((k) => {
    const vals = groups.get(k)!.map(slotValue);
    if (vals.some((v) => v === undefined || v !== vals[0])) throw new Error(`${impl.id}: declared public input ${k} is not a consistent number push`);
    return vals[0]!;
  });
  // candidate claims: a full value vector over the named public inputs
  const candidates: { label: string; values: bigint[] }[] = [];
  names.forEach((name, k) => {
    const set = (v: bigint) => truth.map((t, j) => (j === k ? v : t));
    candidates.push({ label: `${name} + 1`, values: set(truth[k]! + 1n) });
    if (truth[k]! > 0n) candidates.push({ label: `${name} - 1`, values: set(truth[k]! - 1n) });
    if (truth[k]! !== 0n) candidates.push({ label: `${name} = 0`, values: set(0n) });
    candidates.push({ label: `${name} + r`, values: set(truth[k]! + r) });
  });
  if (names.length >= 2 && truth[0] !== truth[1]) candidates.push({ label: 'first two swapped', values: truth.map((t, j) => (j === 0 ? truth[1]! : j === 1 ? truth[0]! : t)) });
  let accepted = 0, tested = 0, skipped = 0, firstAccepted: string | undefined;
  for (const c of candidates) {
    const replace = new Map<number, Uint8Array>();
    let fits = true;
    names.forEach((name, k) => groups.get(name)!.forEach((d) => {
      const ins = [...(replace.has(d.input) ? decodeAuthenticationInstructions(replace.get(d.input)!) : instrOf(d.input))];
      if (d.offset === undefined) ins[d.push] = numberPush(c.values[k]!);
      else {
        const data = writeField(dataOf(ins[d.push]!)!, d.offset, d.encoding ?? 'le32', c.values[k]!);
        if (data === undefined) { fits = false; return; }
        ins[d.push] = decodeAuthenticationInstructions(encodeDataPush(data))[0]!;
      }
      replace.set(d.input, encodeAll(ins));
    }));
    if (!fits) { skipped++; continue; }
    tested++;
    const run = withUnlockings(valid, replace);
    if (run.every((s) => accepts(vm, s, bsv))) { accepted++; firstAccepted ??= c.label; }
  }
  return { declared: true, tested, accepted, firstAccepted, ...(skipped > 0 ? { skipped } : {}) };
};

export interface LayoutResult {
  applicable: boolean;
  padsTested: number;
  malleable: number;
  dependencies: { input: number; push: number; siblings: number[] }[];
}

export const layoutGate = (vm: Bch2026Vm, scenario: Scenario, bsv: boolean): LayoutResult => {
  const valid = scenario.valid;
  if (valid.length < 2 || !valid.every((s) => s.intraTx !== undefined)) return { applicable: false, padsTested: 0, malleable: 0, dependencies: [] };
  const base = valid.map((s) => accepts(vm, s, bsv));
  let padsTested = 0, malleable = 0;
  const dependencies: LayoutResult['dependencies'] = [];
  valid.forEach((s, input) => {
    const ins = decodeAuthenticationInstructions(s.unlockingBytecode);
    ins.forEach((x, push) => {
      if (push === ins.length - 1) return; // the redeem (P2SH) or last push is never a pad
      const d = dataOf(x);
      if (d === undefined || (d.length > 0 && d.length < 8) || d.some((b) => b !== 0)) return; // pads: empty or >= 8 zero bytes
      padsTested++;
      const grown = new Uint8Array(d.length + 32); grown.fill(0xa5, d.length);
      const mut = [...ins]; mut[push] = decodeAuthenticationInstructions(encodeDataPush(grown))[0]!;
      const run = withUnlockings(valid, new Map([[input, encodeAll(mut)]]));
      if (!accepts(vm, run[input]!, bsv)) return; // the input constrains its own pad: not malleable
      malleable++;
      const siblings = run.map((t, j) => (j !== input && base[j] && !accepts(vm, t, bsv) ? j : -1)).filter((j) => j >= 0);
      if (siblings.length > 0) dependencies.push({ input, push, siblings });
    });
  });
  return { applicable: true, padsTested, malleable, dependencies };
};
