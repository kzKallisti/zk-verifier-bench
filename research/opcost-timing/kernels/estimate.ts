// Kernel-sum extrapolation of singleton validation time, per engine.
// Usage: tsx estimate.ts --cut <dir>[,<dir>...] [--bchn run.jsonl ...] [--bchd t.json ...] [--libauth t.json ...]
//        [--full-bchd t.json ...] [--full-libauth t.json ...] --out summary.json > summary.md
//
// Per engine and kernel sample: call time = time(kernel tx) - time(control tx) (same unlocking, same
// OP_DEFINEs; per-tx time, median over repetitions, mean over the given runs), call op-cost = the
// sample call's inclusive libauth op-cost. Rate of a class = mean of its samples' ns per op-cost.
// Singleton estimate = sum over classes of rate x class op-cost, where an unsampled class of a
// sampled function takes that function's op-cost-weighted rate, and the rest (unsampled functions +
// glue: top-level code and own instructions of the too-large functions) takes the op-cost weighted
// rate of everything sampled (bounds: min and max sampled class rate).
// The count-based variant uses mean sample call time x calls in the class instead of the op-cost.
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const all = (k: string) => args.flatMap((a, i) => (a === k ? args[i + 1]!.split(',') : []));
const out = args[args.indexOf('--out') + 1]!;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[n >> 1]! : (s[n / 2 - 1]! + s[n / 2]!) / 2; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---- per-engine per-workload time (ns per tx), averaged over runs
type Times = Map<string, number[]>;
const add = (m: Times, k: string, v: number) => { if (!m.has(k)) m.set(k, []); m.get(k)!.push(v); };
const engines: Record<string, Times> = { bchn: new Map(), bchd: new Map(), libauth: new Map() };
for (const f of all('--bchn')) for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  if (r.error || !r.asExpected) { console.error(`BCHN ${f}: ${r.id} ${r.error ?? 'not as expected'}`); continue; }
  add(engines.bchn!, r.id, r.nsPerTx);
}
for (const [eng, key] of [['bchd', '--bchd'], ['libauth', '--libauth']] as const)
  for (const f of all(key)) for (const r of JSON.parse(readFileSync(f, 'utf8')) as any[]) {
    if (r.accepted !== true) { console.error(`${eng} ${f}: ${r.name} not accepted`); continue; }
    add(engines[eng]!, r.name, r.evalMedianNs);
  }
const full: Record<string, Times> = { bchd: new Map(), libauth: new Map() };
const shape = new Map<string, { txBytes: number; budget: number }>();
const optNum = (k: string, d: number) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
// BCHN reference: worst VM-limits vector l0fhm3 in the calibration run (BCHN.md run 2)
const REF_NS_PER_BUDGET = optNum('--ref-ns-per-budget', 1.251), REF_NS_PER_BYTE = optNum('--ref-ns-per-byte', 1000.2);
for (const [eng, key] of [['bchd', '--full-bchd'], ['libauth', '--full-libauth']] as const)
  for (const f of all(key)) for (const r of JSON.parse(readFileSync(f, 'utf8')) as any[]) {
    if (r.evalMedianNs) add(full[eng]!, r.name, r.evalMedianNs);
    if (r.txBytes && r.budget) shape.set(r.name, { txBytes: r.txBytes, budget: r.budget });
  }

const summary: any[] = [];
const md: string[] = [];
const fmtT = (ns: number) => (ns >= 1e9 ? `${(ns / 1e9).toFixed(2)} s` : ns >= 1e6 ? `${(ns / 1e6).toFixed(1)} ms` : `${(ns / 1e3).toFixed(1)} µs`);
for (const dir of all('--cut')) {
  const cut = JSON.parse(readFileSync(`${dir}/cut.json`, 'utf8'));
  const s: any = { tag: cut.tag, unit: cut.unit, totalOpCost: cut.totalOpCost, glueOpCost: cut.glueOpCost, kernelOpCost: cut.kernelOpCost, engines: {} };
  for (const [eng, times] of Object.entries(engines)) {
    if (!cut.kernels.every((k: any) => times.has(`${k.id}/kernel`) && times.has(`${k.id}/control`))) { if (times.size) console.error(`${eng}: ${cut.tag} incomplete`); continue; }
    const samples = cut.kernels.map((k: any) => {
      const tk = mean(times.get(`${k.id}/kernel`)!), tc = mean(times.get(`${k.id}/control`)!);
      return { id: k.id, fn: k.fn, classKey: k.classKey, op: k.sampleOpCost, tk, tc, call: tk - tc, rate: (tk - tc) / k.sampleOpCost, runs: times.get(`${k.id}/kernel`)!.length };
    });
    const byClass = new Map<string, any[]>(); for (const x of samples) { if (!byClass.has(x.classKey)) byClass.set(x.classKey, []); byClass.get(x.classKey)!.push(x); }
    const cls = new Map<string, { rate: number; callMean: number }>();
    for (const [k, xs] of byClass) cls.set(k, { rate: mean(xs.map((x) => x.rate)), callMean: mean(xs.map((x) => x.call)) });
    // function rates from sampled classes
    const fnT = new Map<string, number>(), fnOp = new Map<string, number>();
    let sampledT = 0, sampledOp = 0, countT = 0;
    for (const c of cut.classes) if (cls.has(c.key)) {
      const t = cls.get(c.key)!.rate * c.opCost;
      fnT.set(c.fn, (fnT.get(c.fn) ?? 0) + t); fnOp.set(c.fn, (fnOp.get(c.fn) ?? 0) + c.opCost);
      sampledT += t; sampledOp += c.opCost; countT += cls.get(c.key)!.callMean * c.count;
    }
    let fnFillT = 0, fnFillOp = 0, restOp = cut.glueOpCost;
    for (const c of cut.classes) if (!cls.has(c.key)) {
      if (fnT.has(c.fn)) { fnFillT += (fnT.get(c.fn)! / fnOp.get(c.fn)!) * c.opCost; fnFillOp += c.opCost; } else restOp += c.opCost;
    }
    const rAll = (sampledT + fnFillT) / (sampledOp + fnFillOp);
    const rates = [...cls.values()].map((c) => c.rate);
    const restT = rAll * restOp;
    const est = sampledT + fnFillT + restT;
    const estLo = sampledT + fnFillT + Math.min(...rates) * restOp, estHi = sampledT + fnFillT + Math.max(...rates) * restOp;
    const estCount = countT + fnFillT + restT;
    const sampleSpread = [...byClass.values()].filter((xs) => xs.length > 1).map((xs) => { const r = xs.map((x) => x.rate); return (Math.max(...r) - Math.min(...r)) / mean(r); });
    const e: any = { est, estLo, estHi, estCount, nsPerOpCost: est / cut.totalOpCost, sampledOpShare: sampledOp / cut.totalOpCost, fnFillOpShare: fnFillOp / cut.totalOpCost, restOpShare: restOp / cut.totalOpCost,
      maxSampleSpread: sampleSpread.length ? Math.max(...sampleSpread) : 0, samples };
    const fm = full[eng]?.get(cut.unit);
    if (fm) { e.fullMeasured = mean(fm); e.estOverFull = est / e.fullMeasured; e.fullRuns = fm.length; }
    s.engines[eng] = e;
  }
  summary.push(s);
}
for (const s of summary) { const sh = shape.get(s.unit); if (sh) Object.assign(s, sh); }
writeFileSync(out, JSON.stringify(summary, null, 1));
// on-chain score bytes (locking + unlocking, results.json), for the per-byte comparison used in BCHN.md
const score: Record<string, number> = Object.fromEntries(all('--score').map((x) => x.split('=')).map(([k, v]) => [k!, Number(v)]));
md.push('| singleton | tx B | score B | BCH 2026 budget | op-cost / budget | BCHN estimate | ns per budget unit | x l0fhm3 per budget unit | µs per tx byte | x l0fhm3 per tx byte | µs per score byte | x l0fhm3 per score byte |', '|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|');
for (const s of summary) { const e = s.engines.bchn; if (!e || !s.budget) continue;
  const sc = score[s.tag];
  md.push(`| ${s.tag} | ${s.txBytes} | ${sc ? sc.toLocaleString('en') : '-'} | ${s.budget.toLocaleString('en')} | ${Math.round(s.totalOpCost / s.budget).toLocaleString('en')} | ${fmtT(e.est)} | ${(e.est / s.budget).toFixed(0)} | ${Math.round((e.est / s.budget) / REF_NS_PER_BUDGET).toLocaleString('en')} | ${(e.est / s.txBytes / 1e3).toFixed(0)} | ${Math.round((e.est / s.txBytes) / REF_NS_PER_BYTE).toLocaleString('en')} | ${sc ? (e.est / sc / 1e3).toFixed(1) : '-'} | ${sc ? Math.round((e.est / sc) / REF_NS_PER_BYTE).toLocaleString('en') : '-'} |`); }
md.push('');
md.push('| singleton | op-cost | engine | estimate | (rest at min / max rate) | count-based | ns/op-cost | measured full run | estimate / measured |', '|---|--:|---|--:|--:|--:|--:|--:|--:|');
for (const s of summary) for (const [eng, e] of Object.entries<any>(s.engines))
  md.push(`| ${s.tag} | ${(s.totalOpCost / 1e6).toFixed(0)}M | ${eng} | ${fmtT(e.est)} | ${fmtT(e.estLo)} / ${fmtT(e.estHi)} | ${fmtT(e.estCount)} | ${e.nsPerOpCost.toFixed(3)} | ${e.fullMeasured ? fmtT(e.fullMeasured) : '-'} | ${e.estOverFull ? e.estOverFull.toFixed(3) : '-'} |`);
md.push('', 'Coverage (share of singleton op-cost): sampled classes / unsampled classes of sampled functions / rest (unsampled functions + glue)', '');
for (const s of summary) { const e: any = Object.values(s.engines)[0]; if (e) md.push(`- ${s.tag}: ${(100 * e.sampledOpShare).toFixed(2)}% / ${(100 * e.fnFillOpShare).toFixed(2)}% / ${(100 * e.restOpShare).toFixed(2)}% (glue ${(100 * s.glueOpCost / s.totalOpCost).toFixed(2)}%)`); }
md.push('', '| kernel sample | call op-cost | ' + Object.keys(engines).map((e) => `${e} call µs | ${e} ns/op`).join(' | ') + ' | ' + Object.keys(engines).map((e) => `${e} control µs`).join(' | ') + ' |');
md.push('|---|--:|' + Object.keys(engines).map(() => '--:|--:|').join('') + Object.keys(engines).map(() => '--:|').join(''));
for (const s of summary) {
  const ids = (Object.values<any>(s.engines)[0]?.samples ?? []).map((x: any) => x.id);
  for (const id of ids) {
    const row = Object.keys(engines).map((eng) => { const x = s.engines[eng]?.samples.find((y: any) => y.id === id); return x ? `${(x.call / 1e3).toFixed(1)} | ${x.rate.toFixed(3)}` : '- | -'; });
    const ctl = Object.keys(engines).map((eng) => { const x = s.engines[eng]?.samples.find((y: any) => y.id === id); return x ? (x.tc / 1e3).toFixed(1) : '-'; });
    const op = (Object.values<any>(s.engines)[0].samples.find((y: any) => y.id === id)).op;
    md.push(`| ${id} | ${op} | ${row.join(' | ')} | ${ctl.join(' | ')} |`);
  }
}
// ---- per-function kernel table (labels: --labels file {tag: {fn: role}})
const labels = all('--labels').length ? JSON.parse(readFileSync(all('--labels')[0]!, 'utf8')) : {};
const engs = Object.keys(engines).filter((e) => summary.some((s) => s.engines[e]));
md.push('', '| singleton | kernel fn | role (inferred) | share of op-cost | kernel calls | op-cost per call | ' + engs.map((e) => `${e} µs/call | ${e} ns/op`).join(' | ') + ' |');
md.push('|---|---|---|--:|--:|--:|' + engs.map(() => '--:|--:|').join(''));
for (const s of summary) {
  const cut = JSON.parse(readFileSync(`${all('--cut').find((d) => d.endsWith('/' + s.tag))}/cut.json`, 'utf8'));
  const fns = [...new Set(cut.kernels.map((k: any) => k.fn))] as string[];
  for (const fn of fns) {
    const calls = cut.classes.filter((c: any) => c.fn === fn).reduce((a: number, c: any) => a + c.count, 0);
    const op = cut.classes.filter((c: any) => c.fn === fn).reduce((a: number, c: any) => a + c.opCost, 0);
    const cells = engs.map((e) => { const xs = s.engines[e]?.samples.filter((x: any) => x.fn === fn) ?? []; if (!xs.length) return '- | -';
      const t = mean(xs.map((x: any) => x.call)), o = mean(xs.map((x: any) => x.op)); return `${(t / 1e3).toFixed(1)} | ${(t / o).toFixed(3)}`; });
    const per = mean(cut.kernels.filter((k: any) => k.fn === fn).map((k: any) => k.sampleOpCost));
    md.push(`| ${s.tag} | 0x${fn} | ${labels[s.tag]?.[fn] ?? ''} | ${(100 * op / s.totalOpCost).toFixed(1)}% | ${calls} | ${Math.round(per).toLocaleString('en')} | ${cells.join(' | ')} |`);
  }
}
console.log(md.join('\n'));
