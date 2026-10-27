// libauth timing / profiling driver over the engine-neutral unit list (make-units.ts).
// Usage: node --expose-gc --import tsx libauth-time.ts <units.json> <out.json> [--profile] [--only substr]
//        [--mintime ms] [--minreps n] [--maxreps n]
// Per unit and repetition: setup = decode tx + source outputs; eval = vm.evaluate() of every listed
// input + stateSuccess. Every repetition's verdict (and, where the unit carries one, op-cost) is
// checked; a mismatch aborts. --profile wraps every operation with a clock (exclusive time, nested
// evaluation subtracted) and attributes time and op-cost deltas per opcode; the VM loop and the
// per-instruction `every` hook are reported as 'loop'.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  createInstructionSetBch2026,
  createInstructionSetBchSpec,
  createVirtualMachine,
  decodeTransactionBch,
  decodeTransactionOutputs,
  hexToBin,
  ripemd160,
  secp256k1,
  sha1,
  sha256,
} from '@bitauth/libauth';

import { loosenedConsensusBch2026 } from '../../src/harness/vm.js';

const args = process.argv.slice(2);
const [unitsPath, outPath] = args as [string, string];
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const PROFILE = args.includes('--profile');
const ONLY = opt('--only', '');
const MINTIME = Number(opt('--mintime', '2000')) * 1e6;
const MINREPS = Number(opt('--minreps', '5'));
const MAXREPS = Number(opt('--maxreps', '2000'));
const gc = (globalThis as any).gc as (() => void) | undefined;
if (!gc) throw new Error('run with --expose-gc');

const instructionSet = (mode: string) =>
  mode === 'bchspec' ? createInstructionSetBchSpec(false)
  : mode === 'loose' ? createInstructionSetBch2026(false, { consensus: loosenedConsensusBch2026 as any, ripemd160, secp256k1, sha1, sha256 })
  : createInstructionSetBch2026(false);

// --- profiling wrapper ---
const prof = { ns: new Float64Array(257), cost: new Float64Array(257), count: new Float64Array(257) };
let lastOp = 256;
const stack: { child: number; childCost: number }[] = [];
const now = () => Number(process.hrtime.bigint());
const wrap = (is: any) => {
  const ops: any = {};
  for (const [k, fn] of Object.entries(is.operations as Record<string, (s: any) => any>)) {
    const code = Number(k);
    ops[k] = (s: any) => {
      lastOp = code;
      const c0 = s.metrics.operationCost;
      stack.push({ child: 0, childCost: 0 });
      const t0 = now();
      const r = fn(s);
      const dt = now() - t0;
      const fr = stack.pop()!;
      const dc = r.metrics.operationCost - c0;
      prof.ns[code] += dt - fr.child;
      prof.cost[code] += dc - fr.childCost;
      prof.count[code] += 1;
      const parent = stack[stack.length - 1];
      if (parent) { parent.child += dt; parent.childCost += dc; }
      return r;
    };
  }
  // libauth adds most op-cost in the per-instruction `every` hook (after the operation): attribute
  // its op-cost delta to the opcode just executed, its time to 'loop' (index 256).
  const every = is.every as ((s: any) => any) | undefined;
  const wrappedEvery = every && ((s: any) => {
    const c0 = s.metrics.operationCost;
    const t0 = now();
    const r = every(s);
    prof.ns[256] += now() - t0;
    prof.count[256] += 1;
    prof.cost[lastOp] += r.metrics.operationCost - c0;
    return r;
  });
  return { ...is, operations: ops, ...(wrappedEvery ? { every: wrappedEvery } : {}) };
};
const timerOverhead = () => {
  const xs: number[] = [];
  const id = (s: any) => s;
  for (let i = 0; i < 200000; i++) { const t0 = now(); id(i); xs.push(now() - t0); }
  xs.sort((a, b) => a - b);
  return xs[xs.length >> 1]!;
};

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[n >> 1]! : (s[n / 2 - 1]! + s[n / 2]!) / 2; };

const units = JSON.parse(readFileSync(unitsPath, 'utf8')) as any[];
const vms = new Map<string, any>();
const vmFor = (mode: string) => {
  const key = `${mode}:${PROFILE}`;
  if (!vms.has(key)) vms.set(key, createVirtualMachine(PROFILE ? wrap(instructionSet(mode)) : instructionSet(mode)));
  return vms.get(key);
};
const results: any[] = [];
for (const u of units) {
  if (ONLY && !`${u.name} ${u.group}`.includes(ONLY)) continue;
  const vm = vmFor(u.mode);
  const txb = hexToBin(u.txHex), sob = hexToBin(u.sourceOutputsHex);
  const run = () => {
    gc();
    const t0 = now();
    const transaction = decodeTransactionBch(txb) as any;
    const so = decodeTransactionOutputs(sob) as any;
    if (typeof transaction === 'string' || typeof so === 'string') throw new Error(`${u.name}: decode`);
    const sourceOutputs = so.result ?? so;
    const inputs: number[] = u.inputs ?? transaction.inputs.map((_: unknown, i: number) => i);
    const t1 = now();
    let ok = true, first = '', evalNs = 0;
    const costs: number[] = [];
    for (const i of inputs) {
      const te = now();
      const st = vm.evaluate({ inputIndex: i, sourceOutputs, transaction });
      const s = vm.stateSuccess(st);
      evalNs += now() - te;
      costs.push(st.metrics.operationCost);
      if (s !== true) { ok = false; if (!first) first = `input ${i}: ${s}`; }
    }
    return { setupNs: t1 - t0, evalNs, ok, first, costs };
  };
  const check = (r: ReturnType<typeof run>) => {
    if (r.ok !== u.expectAccept) { console.error(`VERDICT MISMATCH ${u.name}: ${r.ok} ${r.first}`); process.exit(2); }
    const want: number[] = u.libauthOpCosts ?? u.expectOpCost;
    want.forEach((c, k) => { if (c >= 0 && u.expectAccept && r.costs[k] !== c) { console.error(`OPCOST MISMATCH ${u.name} #${k}: ${r.costs[k]} != ${c}`); process.exit(3); } });
  };
  const res: any = { name: u.name, group: u.group, mode: u.mode, txBytes: txb.length };
  if (PROFILE) {
    prof.ns.fill(0); prof.cost.fill(0); prof.count.fill(0);
    const r = run(); check(r);
    res.accepted = r.ok; res.opCost = r.costs.reduce((a, b) => a + b, 0); res.inputOpCosts = r.costs;
    res.evalNs = r.evalNs; res.timerOverheadNs = timerOverhead();
    res.profile = {} as Record<string, number[]>;
    for (let c = 0; c <= 256; c++) if (prof.count[c]) res.profile[c === 256 ? 'loop' : c.toString(16).padStart(2, '0')] = [prof.count[c], prof.ns[c], prof.cost[c]];
  } else {
    const w = run(); check(w);
    res.accepted = w.ok; res.firstErr = w.first || undefined; res.opCost = w.costs.reduce((a, b) => a + b, 0); res.inputOpCosts = w.costs;
    let reps = Math.max(MINREPS, Math.floor(MINTIME / Math.max(w.evalNs, 1)));
    reps = Math.min(reps, MAXREPS);
    const ev: number[] = [], st: number[] = [];
    for (let k = 0; k < reps; k++) { const r = run(); check(r); ev.push(r.evalNs); st.push(r.setupNs); }
    res.reps = reps; res.evalMedianNs = median(ev); res.setupMedianNs = median(st);
    res.evalMinNs = Math.min(...ev); res.evalMaxNs = Math.max(...ev);
    res.nsPerOpCost = res.evalMedianNs / res.opCost;
    if (reps <= 50) res.evalNs = ev;
  }
  console.error(`${u.name.padEnd(60)} ${u.mode.padEnd(8)} ok=${res.accepted} cost=${res.opCost} eval=${((res.evalMedianNs ?? res.evalNs) / 1e6).toFixed(3)}ms ns/cost=${(res.nsPerOpCost ?? 0).toFixed(4)}`);
  results.push(res);
  writeFileSync(outPath, JSON.stringify(results, null, 1));
}
