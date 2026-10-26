// TXv5-as-written grade for bch-spec entries (bench issue #35, option 2).
//
// bch-spec entries are graded on libauth's BCH_SPEC VM, whose op-cost budget is
// (10,000 + unlockingLen) * 800 per input. TXv5 (CHIP-2025-01 v1.0.0) raises the bytecode and
// stack element caps to 100,000 B but keeps the density-control base at 41, so under TXv5 an
// input's budget is (41 + unlockingLen) * 800, as on BCH 2026. This module answers, for each
// bch-spec entry:
//   1. does the shipped transaction validate on the TXv5 VM (consensus / standard)?
//   2. if not, which minimal zero padding of the unlockings makes every input fit its budget,
//      and what is the padded score?
//
// Padding follows the harness's existing convention (benchmark.ts zeroPadBytes): one all-zero
// data push that the script ignores. If an input already carries such a pad (non-empty, all
// zero, not the last push) it is lengthened; otherwise a new zero push is inserted where the
// convention puts it (just before the redeem script under P2SH, last for a bare/P2S locking).
// Nothing is rebuilt: an entry that pins its push layout (e.g. DEPTH == 2 at entry) rejects
// the pad, and is reported "not paddable as shipped". For those, an ESTIMATE of the padding a
// pad slot would need is given (measured op-cost + the pad's own push and drop), clearly
// labelled as such.
//
// The padding is computed by a least fixpoint: measure each input's op-cost on the TXv5 VM with
// the density budget lifted (every other TXv5 limit applies), grow the short inputs' pads to the
// smallest length that covers it, re-measure (a pad's bytes are themselves pushed and sibling
// inputs may read a padded input via introspection), and repeat until every input fits. The
// result is then replayed on the real TXv5 VM, which must accept every input.
import {
  decodeAuthenticationInstructions,
  encodeAuthenticationInstruction,
  encodeDataPush,
} from '@bitauth/libauth';

import { withUnlockings } from './gates.js';
import type { Scenario, Step } from './types.js';
import {
  createRealVmTxv5,
  createStandardVmTxv5,
  createUnbudgetedVmTxv5,
  evaluatePair,
  isP2sh20Locking,
  isP2sh32Locking,
  MAX_STANDARD_LOCKING_BYTECODE,
  MAX_STANDARD_TRANSACTION_SIZE,
  TXV5_STANDARD_UNLOCKING_CAP,
  type Bch2026Vm,
} from './vm.js';

const DENSITY_BASE = 41;
const PER_BYTE = 800;
const budgetOf = (unlockingLen: number) => (DENSITY_BASE + unlockingLen) * PER_BYTE;
/** Smallest unlocking length whose budget covers `opCost`. */
const neededUnlockingLen = (opCost: number) => Math.ceil(opCost / PER_BYTE) - DENSITY_BASE;

type Instr = ReturnType<typeof decodeAuthenticationInstructions>[number];
const dataOf = (i: Instr): Uint8Array | undefined => ('data' in i ? (i as { data: Uint8Array }).data : undefined);
const isZeroPad = (i: Instr) => {
  const d = dataOf(i);
  return d !== undefined && d.length > 0 && d.every((b) => b === 0);
};
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Where a pad goes in one input, and the unlocking it yields for a given pad data length. */
interface PadSlot {
  kind: 'grow' | 'insert';
  /** pad data length already present (grow) or 0 (insert: no pad yet) */
  base: number;
  build: (dataLen: number) => Uint8Array;
}
const padSlots = (step: Step): PadSlot[] => {
  const ins = decodeAuthenticationInstructions(step.unlockingBytecode);
  const enc = ins.map((i) => encodeAuthenticationInstruction(i));
  const zeroPush = (n: number) => encodeDataPush(new Uint8Array(n));
  const slots: PadSlot[] = [];
  // grow: the last existing zero pad that is not the final push (the redeem under P2SH)
  let at = -1;
  ins.forEach((x, k) => { if (k < ins.length - 1 && isZeroPad(x)) at = k; });
  if (at >= 0) {
    const base = dataOf(ins[at]!)!.length;
    slots.push({ kind: 'grow', base, build: (n) => concat(enc.map((e, k) => (k === at ? zeroPush(n) : e))) });
  }
  // insert: second-to-last under a P2SH envelope (the redeem is pushed last), else last
  const p2sh = isP2sh32Locking(step.lockingBytecode) || isP2sh20Locking(step.lockingBytecode);
  const pos = p2sh ? Math.max(0, enc.length - 1) : enc.length;
  slots.push({ kind: 'insert', base: 0, build: (n) => concat([...enc.slice(0, pos), zeroPush(n), ...enc.slice(pos)]) });
  return slots;
};

/** Smallest pad data length (>= min) whose unlocking is at least `target` bytes long. */
const padLenFor = (slot: PadSlot, target: number, min: number): number => {
  const len = (n: number) => slot.build(n).length;
  let n = Math.max(min, slot.base + Math.max(0, target - len(slot.base)));
  while (len(n) < target) n++;
  while (n > min && len(n - 1) >= target) n--;
  return n;
};

const accepts = (vm: Bch2026Vm, s: Step, bsv: boolean) => {
  const o = evaluatePair(vm, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped);
  return { ok: bsv ? o.bsvAccepted : o.accepted, opCost: o.operationCost, error: o.error };
};

export interface Txv5PadResult {
  /** total bytes added to the unlockings (pad growth incl. push headers) */
  padBytes: number;
  /** bytes added per input, in input order */
  perInput: number[];
  /** headline score of the padded transaction (scripts + tx overhead) */
  score: number;
  /** serialized size of the padded transaction(s) as the harness models it */
  txBytes: number;
}

export interface Txv5ModeGrade {
  /** the shipped transaction validates on this TXv5 mode */
  asShipped: boolean;
  /** first failing input and error when it does not */
  reason?: string;
  /** minimal padding when it does not and the entry is paddable */
  padded?: Txv5PadResult;
}

export interface Txv5Grade {
  vm: 'txv5';
  consensus: Txv5ModeGrade;
  /** standard (relay) mode: per-input standard VM + 201 B locking, 100,000 B unlocking
   * (assumed), 100,000 B transaction */
  standard: Txv5ModeGrade & { fits: boolean; policyReason?: string };
  /** 'not-needed': validates as shipped in both modes; 'paddable': minimal padding found and
   * verified; 'not-paddable': some input that needs budget rejects every pad (pinned layout). */
  padding: 'not-needed' | 'paddable' | 'not-paddable';
  notPaddableReason?: string;
  /** not-paddable only: the padding a pad slot WOULD need (estimate, not measured: assumes
   * the pad costs one push of its bytes plus one OP_DROP, on top of the measured op-cost). */
  estimate?: { padBytes: number; score: number; mode: 'standard' };
  /** the worst-case honest witness (when shipped), graded the same way */
  worstCase?: { consensus: Txv5ModeGrade; standard: Txv5ModeGrade };
}

type ScoreOf = (run: Step[]) => { score: number; txBytes: number };

interface ModeContext {
  standard: boolean;
  real: Bch2026Vm;
  unbudgeted: Bch2026Vm;
}

/** Pad strategy chosen per input (the first slot that keeps the whole run accepting). */
const chooseSlots = (run: Step[], ctx: ModeContext[], bsv: boolean, need: boolean[]):
  { slots: (PadSlot | undefined)[]; failed?: string } => {
  const slots: (PadSlot | undefined)[] = run.map(() => undefined);
  for (let i = 0; i < run.length; i++) {
    if (!need[i]) continue;
    const candidates = padSlots(run[i]!);
    const ok = candidates.find((slot) => {
      const probe = withUnlockings(run, new Map([[i, slot.build(Math.max(slot.base, 0) + 8)]]));
      return ctx.every((c) => probe.every((s) => accepts(c.unbudgeted, s, bsv).ok));
    });
    if (ok === undefined) {
      return { slots, failed: `input ${i} (${run[i]!.label}) rejects a zero pad push (${candidates.map((c) => c.kind).join(' or ')}): the push layout is pinned` };
    }
    slots[i] = ok;
  }
  return { slots };
};

/** Least-fixpoint minimal padding of `run` for one mode; undefined when not paddable. */
const minimalPadding = (run: Step[], c: ModeContext, slots: (PadSlot | undefined)[], bsv: boolean):
  { run: Step[]; perInput: number[] } | { error: string } => {
  const lens: (number | undefined)[] = slots.map((s) => (s === undefined ? undefined : s.base));
  const build = () => withUnlockings(run, new Map(
    slots.flatMap((s, i) => (s === undefined || lens[i] === undefined || (s.kind === 'grow' && lens[i] === s.base) || (s.kind === 'insert' && lens[i] === 0) ? [] : [[i, s.build(lens[i]!)] as [number, Uint8Array]])),
  ));
  for (let iter = 0; iter < 64; iter++) {
    const cur = build();
    const out = cur.map((s) => accepts(c.unbudgeted, s, bsv));
    const bad = out.findIndex((o) => !o.ok);
    if (bad >= 0) return { error: `input ${bad} rejects on the unbudgeted TXv5 VM after padding: ${out[bad]!.error ?? 'not accepted'}` };
    let changed = false;
    cur.forEach((s, i) => {
      const target = neededUnlockingLen(out[i]!.opCost);
      if (s.unlockingBytecode.length >= target) return;
      const slot = slots[i];
      if (slot === undefined) return; // an unpadded input that falls short: caught below
      lens[i] = padLenFor(slot, target, Math.max(lens[i] ?? 0, slot.kind === 'insert' ? 1 : slot.base));
      changed = true;
    });
    if (!changed) {
      const short = cur.findIndex((s, i) => s.unlockingBytecode.length < neededUnlockingLen(out[i]!.opCost));
      if (short >= 0) return { error: `input ${short} exceeds its budget and has no pad slot` };
      // replay on the real TXv5 VM: every input must accept within its own budget
      const realBad = cur.map((s) => accepts(c.real, s, bsv)).findIndex((o) => !o.ok);
      if (realBad >= 0) return { error: `padded input ${realBad} still rejects on the real TXv5 VM` };
      return { run: cur, perInput: cur.map((s, i) => s.unlockingBytecode.length - run[i]!.unlockingBytecode.length) };
    }
  }
  return { error: 'padding did not converge' };
};

const firstFailure = (run: Step[], vm: Bch2026Vm, bsv: boolean): string | undefined => {
  for (let i = 0; i < run.length; i++) {
    const o = accepts(vm, run[i]!, bsv);
    if (!o.ok) {
      const e = (o.error ?? 'not accepted').toLowerCase();
      const tag = e.includes('operation cost') ? 'op-cost over (41 + unlocking) * 800'
        : e.includes('hash') ? 'hash iterations over density budget'
        : e.includes('bytecode length') ? 'script size'
        : o.error ?? 'not accepted';
      return `input ${i} (${run[i]!.label}): ${tag}`;
    }
  }
  return undefined;
};

const standardPolicy = (run: Step[], scoreOf: ScoreOf): string | undefined => {
  const reasons = [
    run.some((s) => s.lockingBytecode.length > MAX_STANDARD_LOCKING_BYTECODE) ? `locking > ${MAX_STANDARD_LOCKING_BYTECODE} B` : null,
    run.some((s) => s.unlockingBytecode.length > TXV5_STANDARD_UNLOCKING_CAP) ? `unlocking > ${TXV5_STANDARD_UNLOCKING_CAP.toLocaleString('en-US')} B` : null,
    scoreOf(run).txBytes > MAX_STANDARD_TRANSACTION_SIZE ? `tx ${scoreOf(run).txBytes.toLocaleString('en-US')} B > ${MAX_STANDARD_TRANSACTION_SIZE.toLocaleString('en-US')} B` : null,
  ].filter(Boolean);
  return reasons.length ? reasons.join('; ') : undefined;
};

/** Estimated padding for an input layout that cannot take a pad as shipped: a new push of
 * `added` encoded bytes (header + L data bytes) costs one push (100 + L) and one OP_DROP (100). */
const pushHeader = (encoded: number) => (encoded <= 76 ? 1 : encoded <= 257 ? 2 : encoded <= 65_538 ? 3 : 5);
const estimatePadding = (run: Step[], c: ModeContext, bsv: boolean): number[] =>
  run.map((s) => {
    const cost = accepts(c.unbudgeted, s, bsv).opCost;
    const u = s.unlockingBytecode.length;
    if (budgetOf(u) >= cost) return 0;
    let added = neededUnlockingLen(cost) - u;
    while (budgetOf(u + added) < cost + 200 + (added - pushHeader(added))) added++;
    return added;
  });

const gradeRun = (run: Step[], bsv: boolean, scoreOf: ScoreOf, ctx: ModeContext[]) => {
  const [cons, std] = ctx as [ModeContext, ModeContext];
  const consFail = firstFailure(run, cons.real, bsv);
  const stdFail = firstFailure(run, std.real, bsv);
  const policy = standardPolicy(run, scoreOf);
  const consensus: Txv5ModeGrade = { asShipped: consFail === undefined, ...(consFail ? { reason: consFail } : {}) };
  const standard: Txv5ModeGrade & { fits: boolean; policyReason?: string } = {
    asShipped: stdFail === undefined && policy === undefined,
    ...(stdFail || policy ? { reason: [stdFail, policy].filter(Boolean).join('; ') } : {}),
    fits: stdFail === undefined && policy === undefined,
    ...(policy ? { policyReason: policy } : {}),
  };
  if (consFail === undefined && stdFail === undefined) return { consensus, standard, padding: 'not-needed' as const };

  // which inputs need budget (in either mode), and does each tolerate a pad?
  const need = run.map((s) => ctx.some((c) => s.unlockingBytecode.length < neededUnlockingLen(accepts(c.unbudgeted, s, bsv).opCost)));
  const unbudgetedOk = ctx.every((c) => run.every((s) => accepts(c.unbudgeted, s, bsv).ok));
  if (!unbudgetedOk || !need.some(Boolean)) {
    return { consensus, standard, padding: 'not-paddable' as const, notPaddableReason: 'rejects on TXv5 for a reason other than the density budget' };
  }
  const { slots, failed } = chooseSlots(run, ctx, bsv, need);
  if (failed !== undefined) {
    const est = estimatePadding(run, std, bsv);
    const estRun = withUnlockings(run, new Map(run.map((s, i) => [i, concat([s.unlockingBytecode, new Uint8Array(est[i]!)])] as [number, Uint8Array])));
    return {
      consensus, standard, padding: 'not-paddable' as const, notPaddableReason: failed,
      estimate: { padBytes: est.reduce((a, b) => a + b, 0), score: scoreOf(estRun).score, mode: 'standard' as const },
    };
  }
  const padFor = (c: ModeContext, asShipped: boolean): Txv5PadResult | { error: string } | undefined => {
    if (asShipped) return undefined;
    const r = minimalPadding(run, c, slots, bsv);
    if ('error' in r) return r;
    const { score, txBytes } = scoreOf(r.run);
    return { padBytes: r.perInput.reduce((a, b) => a + b, 0), perInput: r.perInput, score, txBytes, ...(c.standard ? { policy: standardPolicy(r.run, scoreOf) } : {}) } as Txv5PadResult;
  };
  const pc = padFor(cons, consensus.asShipped);
  const ps = padFor(std, stdFail === undefined);
  const err = [pc, ps].find((p) => p !== undefined && 'error' in p) as { error: string } | undefined;
  if (err) return { consensus, standard, padding: 'not-paddable' as const, notPaddableReason: err.error };
  if (pc) consensus.padded = pc as Txv5PadResult;
  if (ps) {
    const { policy, ...padded } = ps as Txv5PadResult & { policy?: string };
    standard.padded = padded;
    standard.fits = policy === undefined;
    if (policy) standard.policyReason = `padded: ${policy}`; else delete standard.policyReason;
  }
  return { consensus, standard, padding: 'paddable' as const };
};

/** Grade one bch-spec entry on TXv5 as written. `scoreOf` is the harness's own score model. */
export const txv5Grade = (scenario: Scenario, bsv: boolean, scoreOf: ScoreOf): Txv5Grade => {
  const ctx: ModeContext[] = [
    { standard: false, real: createRealVmTxv5(), unbudgeted: createUnbudgetedVmTxv5(false) },
    { standard: true, real: createStandardVmTxv5(), unbudgeted: createUnbudgetedVmTxv5(true) },
  ];
  const main = gradeRun(scenario.valid, bsv, scoreOf, ctx);
  const wc = scenario.worstCaseProof?.length ? gradeRun(scenario.worstCaseProof, bsv, scoreOf, ctx) : undefined;
  return {
    vm: 'txv5',
    ...main,
    ...(wc ? { worstCase: { consensus: wc.consensus, standard: wc.standard } } : {}),
  };
};

/** One-line summary of a TXv5 grade for the site: the figure to show next to the bch-spec score.
 *   'as-shipped'   - validates on TXv5 as shipped; score = the shipped score.
 *   'padded'       - measured: the minimal zero padding validates; score = the padded score
 *                    (standard-mode padding when the padded tx is standard, else consensus).
 *   'not-paddable' - the entry pins its push layout; score = the ESTIMATE for a pad slot (or null).
 *   'invalid'      - rejects on TXv5 for a reason padding cannot fix; score = null. */
export interface Txv5Summary {
  status: 'as-shipped' | 'padded' | 'not-paddable' | 'invalid';
  score: number | null;
  /** the summarised figure is relayable (standard) under the assumed 100,000 B unlocking cap */
  standard: boolean;
  /** score is an estimate (not-paddable), not a measured validating transaction */
  estimated: boolean;
}
export const txv5Summary = (g: Txv5Grade, shippedScore: number): Txv5Summary => {
  if (g.padding === 'not-needed') return { status: 'as-shipped', score: shippedScore, standard: g.standard.fits, estimated: false };
  if (g.padding === 'paddable') {
    const std = g.standard.fits && g.standard.padded !== undefined;
    const score = std ? g.standard.padded!.score : g.consensus.padded?.score ?? (g.consensus.asShipped ? shippedScore : null);
    return { status: 'padded', score, standard: g.standard.fits, estimated: false };
  }
  if (g.estimate) return { status: 'not-paddable', score: g.estimate.score, standard: false, estimated: true };
  return { status: 'invalid', score: null, standard: false, estimated: false };
};
