// Cut a singleton's execution into consensus-valid BCH 2026 kernels.
//
// Usage: tsx extract-kernels.ts <units.json> <unit name> <profile.json> <outDir> [--budget 7.2e6]
//        [--exclude id,id] [--per-fn 4] [--bucket 0.03] [--min-fn-share 0.002] [--tag name]
//
// Method. The singleton is evaluated once on the loosened libauth VM with hooks. A function id is
// kernel-eligible when every call of it costs at most --budget op-cost (profile perMax). A
// "kernel call" is a call of an eligible function made while no other kernel call is open, i.e. the
// outermost calls that fit one input. Everything else (top-level code and the own instructions of
// the ineligible, too-large functions) is "glue". Kernel calls are grouped into classes by
// (function id, inclusive op-cost bucket of +-1.5%); classes are selected per function by total
// op-cost (see below). The first call of each selected class, and for classes holding at least
// --multi-share of the singleton also its 8th and last call, is snapshotted: stack, alternate stack
// and function table at entry, stack and alternate stack at exit, and the ids it invoked.
//
// Each snapshot becomes two single-input BCH 2026 transactions:
//   kernel : unlocking = <pad> <entry stack items, bottom first> <altstack items, reversed>
//            locking   = <body id OP_DEFINE for every function the call reaches>
//                        OP_TOALTSTACK x alt  <id> OP_INVOKE
//                        OP_DEPTH <exit depth + 1> OP_NUMEQUALVERIFY
//                        OP_CAT x (m-1) OP_SHA256 <sha256(exit outputs)> OP_EQUALVERIFY   (m = items above the
//                        unchanged prefix)  OP_2DROP/OP_DROP (prefix + pad)  OP_1
//   control: the same bytes without the call: hashes the entry items above the same prefix.
// The pad is the smallest push that makes (41 + unlocking) * 800 cover libauth op-cost plus the
// OP_DEFINE body bytes BCHN/bchd also charge, with a 0.5% margin. kernel time - control time = the
// call's validation time with all per-input setup (parse, pushes, OP_DEFINEs) cancelled.
//
// Outputs in <outDir>: kernels.json (BCHN rig json source), units.json (bchd/libauth units),
// cut.json (accounting: every class with count and op-cost, which are sampled, glue).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  binToHex, createInstructionSetBch2026, createVirtualMachine, createVirtualMachineBch2026,
  decodeTransactionBch, decodeTransactionOutputs, encodeDataPush, encodeTransactionBch,
  encodeTransactionOutputs, hexToBin, ripemd160, secp256k1, sha1, sha256,
} from '@bitauth/libauth';
import { loosenedConsensusBch2026 } from '../../../src/harness/vm.js';

const args = process.argv.slice(2);
const [unitsPath, unitName, profilePath, outDir] = args as [string, string, string, string];
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const BUDGET = Number(opt('--budget', '7.2e6'));
const EXCLUDE = new Set(opt('--exclude', '').split(',').filter(Boolean));
const PER_FN = Number(opt('--per-fn', '4'));
const BUCKET = Number(opt('--bucket', '0.03'));
const MULTI_SHARE = Number(opt('--multi-share', '0.02'));
const MIN_FN_SHARE = Number(opt('--min-fn-share', '0.002'));
const TAG = opt('--tag', unitName.replace(/:valid$/, '').replace(/^bch-groth16-/, ''));

const u = (JSON.parse(readFileSync(unitsPath, 'utf8')) as any[]).find((x) => x.name === unitName);
if (!u) throw new Error(`no unit ${unitName}`);
const prof = JSON.parse(readFileSync(profilePath, 'utf8'));
const perMax = new Map<string, number>(prof.inputs[0].functions.map((f: any) => [f.id, f.perMax]));
const eligible = (id: string) => !EXCLUDE.has(id) && (perMax.get(id) ?? Infinity) <= BUDGET;

const base: any = createInstructionSetBch2026(false, { consensus: loosenedConsensusBch2026 as any, ripemd160, secp256k1, sha1, sha256 });
type Snap = { id: string; cls: string; idx: number; entry: Uint8Array[]; alt: Uint8Array[]; table: Record<string, Uint8Array>; exit?: Uint8Array[]; altExit?: Uint8Array[]; cost?: number; reached: Set<string> };
const classes = new Map<string, { id: string; cost: number; count: number; firstIdx: number; tot: number; min: number; max: number }>();
const kept = new Map<string, { first?: Snap; eighth?: Snap; last?: Snap }>();
const call: { id: string; marker: number; c0: number; kernel?: Snap; kernelC0?: number }[] = [];
let kernelOpen: Snap | undefined, kernelC0 = 0, kernelIdx = 0, kernelCost = 0;
let pending: string | undefined;
const total = { cost: 0 };

const popReturned = (s: any) => {
  while (call.length && s.controlStack.length <= call[call.length - 1]!.marker) {
    const fr = call.pop()!;
    if (fr.kernel) {
      const sn = fr.kernel;
      const cost = s.metrics.operationCost - fr.kernelC0!;
      const cls = `${sn.id}:${Math.round(Math.log(Math.max(cost, 1)) / Math.log(1 + BUCKET))}`;
      let c = classes.get(cls);
      if (!c) { c = { id: sn.id, cost, count: 0, firstIdx: sn.idx, tot: 0, min: cost, max: cost }; classes.set(cls, c); }
      c.count++; c.tot += cost; c.min = Math.min(c.min, cost); c.max = Math.max(c.max, cost);
      kernelCost += cost;
      // snapshots: first, 8th and last call of every class (the last one is overwritten as calls come in)
      sn.cls = cls; sn.cost = cost; sn.exit = s.stack.slice(); sn.altExit = s.alternateStack.slice();
      let kk = kept.get(cls); if (!kk) { kk = {}; kept.set(cls, kk); }
      if (c.count === 1) kk.first = sn; else if (c.count === 8) kk.eighth = sn; else kk.last = sn;
      kernelOpen = undefined;
    }
  }
};
const ops: any = {};
for (const [k, fn] of Object.entries(base.operations as Record<string, (s: any) => any>)) {
  const code = Number(k);
  ops[k] = (s: any) => {
    popReturned(s);
    if (code === 0x8a && s.stack.length) pending = binToHex(s.stack[s.stack.length - 1]);
    const marker = s.controlStack.length;
    const c0 = s.metrics.operationCost;
    let pre: { stack: Uint8Array[]; alt: Uint8Array[]; table: Record<string, Uint8Array> } | undefined;
    if (pending !== undefined && !kernelOpen && eligible(pending)) pre = { stack: s.stack.slice(0, -1), alt: s.alternateStack.slice(), table: { ...s.functionTable } };
    const r = fn(s);
    if (pending !== undefined) {
      if (r.controlStack.length === marker + 1 && typeof r.controlStack[marker] === 'object') {
        const fr: (typeof call)[number] = { id: pending, marker, c0 };
        if (kernelOpen) kernelOpen.reached.add(pending);
        if (pre) {
          const sn: Snap = { id: pending, cls: '', idx: kernelIdx++, entry: pre.stack, alt: pre.alt, table: pre.table, reached: new Set([pending]) };
          fr.kernel = sn; fr.kernelC0 = c0; kernelOpen = sn;
        }
        call.push(fr);
      }
      pending = undefined;
    }
    return r;
  };
}
const vmLoose = createVirtualMachine({ ...base, operations: ops } as any);
const tx0 = decodeTransactionBch(hexToBin(u.txHex)) as any;
const so0 = decodeTransactionOutputs(hexToBin(u.sourceOutputsHex)) as any;
const st = vmLoose.evaluate({ inputIndex: 0, sourceOutputs: so0.result ?? so0, transaction: tx0 });
popReturned({ controlStack: [], metrics: st.metrics, stack: st.stack, alternateStack: st.alternateStack });
if (vmLoose.stateSuccess(st) !== true) throw new Error('singleton did not verify: ' + vmLoose.stateSuccess(st));
total.cost = st.metrics.operationCost;
const glue = total.cost - kernelCost;
console.error(`${unitName}: total ${total.cost}, kernel calls ${kernelIdx} (${(100 * kernelCost / total.cost).toFixed(2)}%), glue ${glue} (${(100 * glue / total.cost).toFixed(2)}%), classes ${classes.size}`);

// ---- class selection. A class = (function, op-cost bucket of +-BUCKET/2). Per function with at least
// MIN_FN_SHARE of the singleton's op-cost: its classes by total op-cost, until 90% of the function is
// covered or PER_FN classes are taken. The rate of a function's unsampled classes is the op-cost
// weighted rate of its sampled ones; functions below MIN_FN_SHARE and glue use the singleton's rate.
const ranked = [...classes.entries()].map(([k, c]) => ({ key: k, ...c })).sort((a, b) => b.tot - a.tot);
const fnTot = new Map<string, number>(); for (const c of ranked) fnTot.set(c.id, (fnTot.get(c.id) ?? 0) + c.tot);
const sel = new Set<string>(); let covered = 0;
for (const [id, t] of [...fnTot.entries()].sort((a, b) => b[1] - a[1])) {
  if (t < MIN_FN_SHARE * total.cost) continue;
  let got = 0, n = 0;
  for (const c of ranked) { if (c.id !== id) continue; if (got >= 0.9 * t || n >= PER_FN) break; sel.add(c.key); got += c.tot; n++; }
  covered += got;
}
// ---- build transactions
const vmReal = createVirtualMachineBch2026(false);
const push = encodeDataPush;
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const num = (n: number) => (n === 0 ? Uint8Array.of(0x00) : n <= 16 ? Uint8Array.of(0x50 + n) : push(vmNum(n)));
const vmNum = (n: number) => { const b: number[] = []; let x = n; while (x > 0) { b.push(x & 0xff); x >>= 8; } if (b[b.length - 1]! & 0x80) b.push(0); return Uint8Array.from(b); };
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const drops = (n: number) => cat(...Array(n >> 1).fill(Uint8Array.of(0x6d)), ...(n & 1 ? [Uint8Array.of(0x75)] : []));
const OP = { TOALT: 0x6b, INVOKE: 0x8a, DEFINE: 0x89, DEPTH: 0x74, NUMEQUALVERIFY: 0x9d, CAT: 0x7e, SHA256: 0xa8, EQUALVERIFY: 0x88, ONE: 0x51, RETURN: 0x6a };
const hashCheck = (items: Uint8Array[]) => items.length === 0 ? new Uint8Array(0)
  : cat(...Array(items.length - 1).fill(Uint8Array.of(OP.CAT)), Uint8Array.of(OP.SHA256), push(sha256.hash(cat(...items))), Uint8Array.of(OP.EQUALVERIFY));

const mkTx = (locking: Uint8Array, unlocking: Uint8Array) => {
  const transaction = { version: 2, locktime: 0, inputs: [{ outpointTransactionHash: sha256.hash(locking), outpointIndex: 0, sequenceNumber: 0, unlockingBytecode: unlocking }], outputs: [{ lockingBytecode: Uint8Array.of(OP.RETURN), valueSatoshis: 0n }] };
  const sourceOutputs = [{ lockingBytecode: locking, valueSatoshis: 1000n }];
  return { transaction, sourceOutputs };
};
const evalReal = (locking: Uint8Array, unlocking: Uint8Array) => {
  const { transaction, sourceOutputs } = mkTx(locking, unlocking);
  const s = vmReal.evaluate({ inputIndex: 0, sourceOutputs, transaction } as any);
  return { ok: vmReal.stateSuccess(s), cost: s.metrics.operationCost, ok2: vmReal.verify({ transaction, sourceOutputs } as any) };
};

const vmLoosePlain = createVirtualMachine(base);
const evalLoose = (locking: Uint8Array, unlocking: Uint8Array) => {
  const { transaction, sourceOutputs } = mkTx(locking, unlocking);
  const s = vmLoosePlain.evaluate({ inputIndex: 0, sourceOutputs, transaction } as any);
  if (vmLoosePlain.stateSuccess(s) !== true) throw new Error('kernel fails on the loosened VM: ' + vmLoosePlain.stateSuccess(s));
  return { cost: s.metrics.operationCost };
};
const workloads: any[] = []; const units: any[] = []; const kernels: any[] = []; const problems: string[] = [];
const samples: [string, number, Snap][] = [];
for (const key of sel) {
  const kk = kept.get(key)!; const c = classes.get(key)!;
  samples.push([key, 0, kk.first!]);
  if (c.tot >= MULTI_SHARE * total.cost) { if (kk.eighth) samples.push([key, 1, kk.eighth]); if (kk.last) samples.push([key, 2, kk.last]); }
}
for (const [key, sIdx, sn] of samples) {
  const exit = sn.exit!, entry = sn.entry;
  if (sn.altExit!.length !== sn.alt.length || !sn.altExit!.every((x, i) => eq(x, sn.alt[i]!))) { problems.push(`${key}: alternate stack changed by the call`); continue; }
  let p = 0; while (p < entry.length && p < exit.length && eq(entry[p]!, exit[p]!)) p++;
  const reachedIds = [...sn.reached].sort();
  const defines = cat(...reachedIds.map((id) => { const body = sn.table[id]; if (!body) throw new Error(`no body for ${id}`); return cat(push(body), push(hexToBin(id)), Uint8Array.of(OP.DEFINE)); }));
  const defineBodyBytes = reachedIds.reduce((s, id) => s + sn.table[id]!.length, 0);
  const toAlt = new Uint8Array(sn.alt.length).fill(OP.TOALT);
  const tail = (depth: number, items: Uint8Array[]) => cat(Uint8Array.of(OP.DEPTH), num(depth), Uint8Array.of(OP.NUMEQUALVERIFY), hashCheck(items), drops(p + 1), Uint8Array.of(OP.ONE));
  const kLock = cat(defines, toAlt, push(hexToBin(sn.id)), Uint8Array.of(OP.INVOKE), tail(exit.length + 1, exit.slice(p)));
  const cLock = cat(defines, toAlt, tail(entry.length + 1, entry.slice(p)));
  const body = cat(...entry.map((x) => push(x)), ...[...sn.alt].reverse().map((x) => push(x)));
  // pad: smallest push so that the budget covers libauth op-cost + define bodies (BCHN rule) + 0.5%
  const probeK = evalLoose(kLock, cat(Uint8Array.of(0x00), body));
  const need = Math.ceil(((probeK.cost + defineBodyBytes) * 1.005) / 800) - 41;
  let padLen = 0; const padPush = (n: number) => (n === 0 ? Uint8Array.of(0x00) : push(new Uint8Array(n).fill(0xa5)));
  while (padPush(padLen).length + body.length < need) padLen += Math.max(1, need - padPush(padLen).length - body.length);
  const unlocking = cat(padPush(padLen), body);
  if (unlocking.length > 10_000 || kLock.length > 10_000) { problems.push(`${key}: does not fit (unlocking ${unlocking.length}, locking ${kLock.length}, op-cost ${probeK.cost})`); continue; }
  const k = evalReal(kLock, unlocking), c = evalReal(cLock, unlocking);
  const budget = (41 + unlocking.length) * 800;
  if (k.ok !== true || k.ok2 !== true) { problems.push(`${key}: kernel fails on BCH 2026: ${k.ok} / ${k.ok2}`); continue; }
  if (c.ok !== true || c.ok2 !== true) { problems.push(`${key}: control fails on BCH 2026: ${c.ok} / ${c.ok2}`); continue; }
  if (k.cost + defineBodyBytes > budget) { problems.push(`${key}: over budget under BCHN accounting`); continue; }
  const cl = classes.get(key)!;
  const id = `${TAG}/f${sn.id || 'empty'}/c${sn.cost}/s${sIdx}`;
  const clTot = cl.tot, clCount = cl.count;
  const meta = { singleton: unitName.replace(/:valid$/, ''), fn: sn.id, classKey: key, sample: sIdx, sampleOpCost: sn.cost, classCount: clCount, classOpCost: clTot, classMin: cl.min, classMax: cl.max, classShare: clTot / total.cost, fnOpCost: fnTot.get(sn.id), fnShare: fnTot.get(sn.id)! / total.cost, firstCallIndex: sn.idx, reached: reachedIds, stackItems: entry.length, altItems: sn.alt.length, prefixKept: p, outputs: exit.length - p, unlockingBytes: unlocking.length, lockingBytes: kLock.length, controlLockingBytes: cLock.length, defineBodyBytes, budget, kernelOpCost: k.cost, controlOpCost: c.cost, callOpCostInKernel: k.cost - c.cost };
  kernels.push({ id, ...meta });
  for (const [role, lock, cost] of [['kernel', kLock, k.cost], ['control', cLock, c.cost]] as const) {
    const wid = `${id}/${role}`;
    workloads.push({ id: wid, group: `kernel/${TAG}`, description: `${role} for ${meta.singleton} function 0x${sn.id} call class op-cost ${sn.cost} (x${cl.count})`, expect: 'accept', version: 2, locktime: 0,
      inputs: [{ sourceLockingHex: binToHex(lock), valueSatoshis: 1000, unlockingHex: binToHex(unlocking), sequenceNumber: 0 }], outputs: [{ lockingHex: '6a', valueSatoshis: 0 }] });
    const { transaction, sourceOutputs } = mkTx(lock, unlocking);
    units.push({ name: wid, group: `kernel/${TAG}`, mode: 'bch2026', txHex: binToHex(encodeTransactionBch(transaction as any)), sourceOutputsHex: binToHex(encodeTransactionOutputs(sourceOutputs as any)), inputs: [0], expectAccept: true, expectOpCost: [-1], libauthOpCosts: [cost], libauthOpCost: cost });
  }
}
mkdirSync(outDir, { recursive: true });
const cut = {
  unit: unitName, tag: TAG, budget: BUDGET, exclude: [...EXCLUDE], totalOpCost: total.cost, kernelCalls: kernelIdx, kernelOpCost: kernelCost, glueOpCost: glue,
  sampledClassOpCost: [...new Set(kernels.map((k) => k.classKey))].reduce((s, k) => s + classes.get(k)!.tot, 0),
  sampledFnOpCost: [...new Set(kernels.map((k) => k.fn))].reduce((s, f) => s + fnTot.get(f)!, 0),
  classes: ranked.map((c) => ({ key: c.key, fn: c.id, count: c.count, opCost: c.tot, min: c.min, max: c.max, sampled: kernels.some((x) => x.classKey === c.key) })),
  kernels, problems,
};
writeFileSync(`${outDir}/cut.json`, JSON.stringify(cut, null, 1));
writeFileSync(`${outDir}/kernels.json`, JSON.stringify({ workloads }, null, 1));
writeFileSync(`${outDir}/units.json`, JSON.stringify(units, null, 1));
console.error(`selected ${sel.size} classes, built ${kernels.length} kernels; sampled classes cover ${(100 * cut.sampledClassOpCost / total.cost).toFixed(2)}%, sampled functions ${(100 * cut.sampledFnOpCost / total.cost).toFixed(2)}% of the singleton op-cost; problems: ${problems.length}`);
for (const p of problems) console.error('  ' + p);
for (const kx of kernels.slice(0, 200)) console.error(`  ${kx.id.padEnd(40)} x${String(kx.classCount).padStart(6)} [${kx.classMin}..${kx.classMax}] share=${(100 * kx.classShare).toFixed(2)}% stack=${kx.stackItems}/${kx.altItems} out=${kx.outputs} U=${kx.unlockingBytes} L=${kx.lockingBytes} call=${kx.callOpCostInKernel} reached=${kx.reached.length}`);
