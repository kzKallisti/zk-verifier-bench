// Call-tree op-cost profile of a verifier unit under libauth (loosened VM for singletons).
// Usage: tsx profile-calls.ts <units.json> <unit name> <out.json>
// Per function id: calls, inclusive/exclusive op-cost, per-call inclusive min/median/max,
// callers, and max operand byte length seen; top-level (outside any function) op-cost;
// per-opcode op-cost and counts split by "inside function f" (innermost) for later kernel coverage.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  binToHex, createInstructionSetBch2026, createInstructionSetBchSpec, createVirtualMachine,
  decodeTransactionBch, decodeTransactionOutputs, hexToBin, ripemd160, secp256k1, sha1, sha256,
} from '@bitauth/libauth';
import { loosenedConsensusBch2026 } from '../../../src/harness/vm.js';

const [unitsPath, name, outPath] = process.argv.slice(2) as [string, string, string];
const u = (JSON.parse(readFileSync(unitsPath, 'utf8')) as any[]).find((x) => x.name === name);
if (!u) throw new Error(`no unit ${name}`);
const base: any = u.mode === 'bchspec' ? createInstructionSetBchSpec(false)
  : u.mode === 'loose' ? createInstructionSetBch2026(false, { consensus: loosenedConsensusBch2026 as any, ripemd160, secp256k1, sha1, sha256 })
  : createInstructionSetBch2026(false);

type F = { calls: number; incl: number; excl: number; per: number[]; callers: Record<string, number>; instr: number; maxItem: number };
const fns = new Map<string, F>();
const fget = (id: string) => { let f = fns.get(id); if (!f) { f = { calls: 0, incl: 0, excl: 0, per: [], callers: {}, instr: 0, maxItem: 0 }; fns.set(id, f); } return f; };
let top = 0, topInstr = 0, topMaxItem = 0;
const call: { id: string; marker: number; c0: number }[] = [];
let c0 = 0, pendingInvoke: string | undefined;
const opByFn = new Map<string, Map<number, [number, number]>>(); // innermost fn -> opcode -> [count, cost]
let curOp = 0;

const popReturned = (s: any) => {
  while (call.length && s.controlStack.length <= call[call.length - 1]!.marker) {
    const fr = call.pop()!;
    const f = fns.get(fr.id)!;
    f.per.push(s.metrics.operationCost - fr.c0);
  }
};
const ops: any = {};
for (const [k, fn] of Object.entries(base.operations as Record<string, (s: any) => any>)) {
  const code = Number(k);
  ops[k] = (s: any) => {
    popReturned(s);
    c0 = s.metrics.operationCost;
    curOp = code;
    if (code === 0x8a && s.stack.length) pendingInvoke = binToHex(s.stack[s.stack.length - 1]);
    const marker = s.controlStack.length;
    const r = fn(s);
    if (pendingInvoke !== undefined) {
      // invoked iff a frame object was pushed
      if (r.controlStack.length === marker + 1 && typeof r.controlStack[marker] === 'object') {
        const f = fget(pendingInvoke);
        f.calls++;
        const parent = call.length ? call[call.length - 1]!.id : 'top';
        f.callers[parent] = (f.callers[parent] ?? 0) + 1;
        call.push({ id: pendingInvoke, marker, c0 });
      }
      pendingInvoke = undefined;
    }
    return r;
  };
}
const every = (s: any) => {
  const r = base.every(s);
  const d = r.metrics.operationCost - c0;
  // the INVOKE instruction itself is charged to the caller (frame just pushed is the callee)
  const frames = curOp === 0x8a && call.length && call[call.length - 1]!.c0 === c0 ? call.slice(0, -1) : call;
  let mi = 0;
  const st = r.stack; if (st.length) mi = st[st.length - 1].length;
  if (frames.length === 0) { top += d; topInstr++; if (mi > topMaxItem) topMaxItem = mi; }
  else {
    const inner = frames[frames.length - 1]!.id;
    const seen = new Set<string>();
    for (const fr of frames) { if (seen.has(fr.id)) continue; seen.add(fr.id); fns.get(fr.id)!.incl += d; }
    const f = fns.get(inner)!; f.excl += d; f.instr++; if (mi > f.maxItem) f.maxItem = mi;
  }
  const key = frames.length ? frames[frames.length - 1]!.id : 'top';
  let m = opByFn.get(key); if (!m) { m = new Map(); opByFn.set(key, m); }
  const e = m.get(curOp) ?? [0, 0]; e[0]++; e[1] += d; m.set(curOp, e);
  return r;
};
const vm = createVirtualMachine({ ...base, operations: ops, every } as any);
const tx = decodeTransactionBch(hexToBin(u.txHex)) as any;
const so = (decodeTransactionOutputs(hexToBin(u.sourceOutputsHex)) as any);
const inputs: number[] = u.inputs ?? [u.primaryIndex ?? 0];
const out: any = { name, mode: u.mode, inputs: [] };
for (const i of inputs) {
  fns.clear(); top = 0; topInstr = 0; topMaxItem = 0; call.length = 0; opByFn.clear();
  const t0 = Date.now();
  const st = vm.evaluate({ inputIndex: i, sourceOutputs: so.result ?? so, transaction: tx });
  popReturned({ controlStack: [], metrics: st.metrics });
  const ok = vm.stateSuccess(st);
  const total = st.metrics.operationCost;
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
  const functions = [...fns.entries()].map(([id, f]) => ({ id, calls: f.calls, incl: f.incl, excl: f.excl, instr: f.instr, maxItem: f.maxItem,
    perMin: f.per.reduce((a, b) => Math.min(a, b), Infinity), perMed: med(f.per), perMax: f.per.reduce((a, b) => Math.max(a, b), 0), distinctPer: new Set(f.per).size, callers: f.callers }))
    .sort((a, b) => b.incl - a.incl);
  const opsOut: any = {};
  for (const [k, m] of opByFn) opsOut[k] = Object.fromEntries([...m.entries()].map(([c, v]) => [c.toString(16).padStart(2, '0'), v]));
  out.inputs.push({ input: i, ok: ok === true ? true : String(ok), total, top, topInstr, topMaxItem, ms: Date.now() - t0, functions, ops: opsOut });
  console.error(`${name} input ${i}: ok=${ok} total=${total} top=${top} (${(100 * top / total).toFixed(2)}%) fns=${functions.length} ${Date.now() - t0}ms`);
  for (const f of functions.slice(0, 40)) console.error(`  ${f.id.padEnd(8)} calls=${String(f.calls).padStart(8)} incl=${(100 * f.incl / total).toFixed(2).padStart(6)}% excl=${(100 * f.excl / total).toFixed(2).padStart(6)}% per[min/med/max]=${f.perMin}/${f.perMed}/${f.perMax} distinct=${f.distinctPer} maxItem=${f.maxItem} callers=${JSON.stringify(f.callers)}`);
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
