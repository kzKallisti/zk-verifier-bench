// Summarise opcost-timing results (bchd + libauth) into markdown tables.
// Usage: node analyze.mjs <full dir>   (reads units.json, results/*.json; writes results/summary.md + summary.json)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const dir = process.argv[2];
const J = (p) => JSON.parse(readFileSync(`${dir}/${p}`, 'utf8'));
const units = J('units.json');
const unitBy = new Map(units.map((u) => [u.name, u]));
const load = (p) => (existsSync(`${dir}/${p}`) ? J(p) : []);

export const classOf = (op) => {
  if (op === 'loop') return 'VM loop/accounting';
  const c = parseInt(op, 16);
  if (c <= 0x60) return 'push';
  if ((c >= 0x61 && c <= 0x6a) || c === 0x89 || c === 0x8a || c === 0xab || (c >= 0xb0 && c <= 0xb9) || c === 0xff) return 'control';
  if (c >= 0x6b && c <= 0x7d) return 'stack';
  if ((c >= 0x7e && c <= 0x88) || c === 0xbc) return 'bytes/serialization';
  if (c >= 0x95 && c <= 0x97) return 'mul/div/mod';
  if ((c >= 0x8b && c <= 0x94) || (c >= 0x98 && c <= 0xa5)) return 'add/sub/cmp/shift';
  if (c >= 0xa6 && c <= 0xaa) return 'hashing';
  if ((c >= 0xac && c <= 0xaf) || c === 0xba || c === 0xbb) return 'sigcheck';
  if (c >= 0xc0 && c <= 0xd3) return 'introspection';
  return 'other';
};
export const CLASSES = ['mul/div/mod', 'add/sub/cmp/shift', 'hashing', 'sigcheck', 'push', 'stack', 'bytes/serialization', 'introspection', 'control', 'VM loop/accounting', 'other'];

const fmt = (x, d = 2) => (x === undefined || x === null || Number.isNaN(x) ? '-' : Number(x).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
const int = (x) => (x === undefined ? '-' : Math.round(x).toLocaleString('en-US'));
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// merge repeated timing passes per engine: median of the per-pass medians, spread = min..max over all reps
const engines = { bchd: ['bchd-time-1.json', 'bchd-time-2.json'], libauth: ['libauth-time-1.json', 'libauth-time-2.json'] };
const timing = {};
for (const [eng, files] of Object.entries(engines)) {
  timing[eng] = new Map();
  for (const f of files) for (const r of load(`results/${f}`)) {
    const t = timing[eng].get(r.name) ?? { passes: [], r };
    t.passes.push({ med: r.evalMedianNs, min: r.evalMinNs, max: r.evalMaxNs, setup: r.setupMedianNs, reps: r.reps?.length ?? r.reps });
    timing[eng].set(r.name, t);
  }
}
const prof = { bchd: new Map(load('results/bchd-profile.json').map((r) => [r.name, r])), libauth: new Map(load('results/libauth-profile.json').map((r) => [r.name, r])) };

const out = [];
const summary = { verifiers: [], vmb: [], profiles: {} };
const row = (eng, name) => {
  const t = timing[eng].get(name);
  if (!t) return undefined;
  const m = med(t.passes.map((p) => p.med));
  const lo = Math.min(...t.passes.map((p) => p.min)), hi = Math.max(...t.passes.map((p) => p.max));
  const opCost = t.r.opCost;
  return { med: m, lo, hi, setup: med(t.passes.map((p) => p.setup)), opCost, nsPerCost: m / opCost, passes: t.passes.length, budget: t.r.budget, txBytes: t.r.txBytes };
};

// ---------- verifiers ----------
const vNames = units.filter((u) => u.group === 'verifier').map((u) => u.name);
out.push('## Verifier workloads: ns per op-cost\n');
out.push('Op-cost is each engine\'s own composite (non-standard) op-cost summed over the evaluated inputs; bchd also charges OP_DEFINE body bytes (BCHN rule), libauth does not. Eval = median of per-pass medians; spread = fastest..slowest repetition over all passes, as % of the median. Setup = decode + sighash midstate + engine construction (bchd) / decode (libauth).\n');
out.push('| workload | mode | tx B | inputs | op-cost (bchd) | BCH-2026 budget | budget x | bchd eval ms | spread | bchd ns/op-cost | bchd setup µs | libauth eval ms | spread | libauth ns/op-cost | libauth/bchd |');
out.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|');
for (const n of vNames) {
  const u = unitBy.get(n), b = row('bchd', n), l = row('libauth', n);
  if (!b && !l) continue;
  const tx = b?.txBytes ?? l?.txBytes;
  const nIn = u.inputs?.length ?? 1;
  // BCH-2026 budget for each input = (41 + unlocking) * 800 (bchd result carries the mode's budget; recompute for 2026)
  const bud2026 = b?.budget && u.mode === 'bchspec' ? b.budget - nIn * (10000 - 41) * 800 : b?.budget;
  const sp = (r) => (r ? `${fmt(((r.lo - r.med) / r.med) * 100, 1)}..+${fmt(((r.hi - r.med) / r.med) * 100, 1)}%` : '-');
  out.push(`| ${n} | ${u.mode} | ${int(tx)} | ${nIn} | ${int(b?.opCost)} | ${int(bud2026)} | ${fmt((b?.opCost) / bud2026, 1)} | ${fmt(b?.med / 1e6, 2)} | ${sp(b)} | ${fmt(b?.nsPerCost, 4)} | ${fmt(b?.setup / 1e3, 1)} | ${fmt(l?.med / 1e6, 1)} | ${sp(l)} | ${fmt(l?.nsPerCost, 3)} | ${fmt(l && b ? l.med / b.med : undefined, 1)} |`);
  summary.verifiers.push({ name: n, mode: u.mode, txBytes: tx, inputs: nIn, bchd: b, libauth: l, budget2026: bud2026 });
}

// ---------- vmb ----------
const vmbNames = units.filter((u) => u.group !== 'verifier').map((u) => u.name);
const vrows = [];
for (const n of vmbNames) {
  const u = unitBy.get(n), b = row('bchd', n), l = row('libauth', n);
  if (!b) continue;
  vrows.push({ name: n, id: n.slice(4), group: u.group, desc: u.desc, txBytes: b.txBytes, opCost: b.opCost, budget: b.budget, bchdMed: b.med, bchdNsPerCost: b.nsPerCost, bchdNsPerByte: b.med / b.txBytes, bchdNsPerBudget: b.med / b.budget, libMed: l?.med, libNsPerCost: l?.nsPerCost, libNsPerByte: l ? l.med / b.txBytes : undefined, libNsPerBudget: l ? l.med / b.budget : undefined, bLo: b.lo, bHi: b.hi });
}
summary.vmb = vrows;
const base = vrows.find((r) => r.id === 'trxhzt');
out.push('\n## VM-limits benchmark vectors (libauth bch_2026 standard + nonstandard *benchmarks*)\n');
out.push(`${vrows.length} transactions, every input evaluated, every verdict and primary-input op-cost checked against the vectors. Baseline trxhzt: bchd ${fmt(base?.bchdMed / 1e3, 1)} µs, libauth ${fmt(base?.libMed / 1e3, 1)} µs.\n`);
const top = (key, k, title) => {
  out.push(`\n### ${title}\n`);
  out.push('| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd ns/tx byte | libauth µs | libauth ns/op-cost | libauth ns/budget unit | description |');
  out.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|');
  for (const r of [...vrows].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, k))
    out.push(`| ${r.id} | ${r.group} | ${int(r.txBytes)} | ${int(r.opCost)} | ${fmt((r.opCost / r.budget) * 100, 0)}% | ${fmt(r.bchdMed / 1e3, 1)} | ${fmt(r.bchdNsPerCost, 3)} | ${fmt(r.bchdNsPerBudget, 4)} | ${fmt(r.bchdNsPerByte, 1)} | ${fmt(r.libMed / 1e3, 1)} | ${fmt(r.libNsPerCost, 3)} | ${fmt(r.libNsPerBudget, 4)} | ${(r.desc ?? '').slice(0, 110)} |`);
};
top('bchdNsPerBudget', 12, 'Worst cases by bchd ns per budget unit (time / sum of input budgets: what the byte-tied budget lets a tx cost)');
top('bchdNsPerCost', 12, 'Worst cases by bchd ns per op-cost unit');
top('libNsPerBudget', 8, 'Worst cases by libauth ns per budget unit');
top('bchdNsPerByte', 6, 'Worst cases by bchd ns per tx byte');
// per group summary
out.push('\n### Per vector group (bchd): median and max ns/op-cost and ns/budget unit\n');
out.push('| group | n | median ns/op-cost | max ns/op-cost | max ns/budget unit | libauth median ns/op-cost | libauth max ns/op-cost |');
out.push('|---|--:|--:|--:|--:|--:|--:|');
const groups = [...new Set(vrows.map((r) => r.group))];
for (const g of groups) {
  const rs = vrows.filter((r) => r.group === g);
  const lib = rs.filter((r) => r.libNsPerCost !== undefined);
  out.push(`| ${g} | ${rs.length} | ${fmt(med(rs.map((r) => r.bchdNsPerCost)), 3)} | ${fmt(Math.max(...rs.map((r) => r.bchdNsPerCost)), 3)} | ${fmt(Math.max(...rs.map((r) => r.bchdNsPerBudget)), 4)} | ${lib.length ? fmt(med(lib.map((r) => r.libNsPerCost)), 3) : '-'} | ${lib.length ? fmt(Math.max(...lib.map((r) => r.libNsPerCost)), 3) : '-'} |`);
}

// ---------- profiles ----------
const profTable = (eng) => {
  const P = prof[eng];
  if (!P.size) return;
  out.push(`\n## Opcode-class profile: ${eng}\n`);
  out.push(eng === 'bchd'
    ? 'Per instruction: wall time of Engine.Step (op + accounting + limit checks) minus the measured empty-span timer overhead; op-cost = composite op-cost delta of that step. Cells: time share / op-cost share. Last columns: profiled time per op-cost unit per class (ns).\n'
    : 'Per instruction: exclusive operation time minus timer overhead; the per-instruction `every` hook (op-cost accounting, limit checks) is the VM loop/accounting row; op-cost delta of `every` is attributed to the opcode just executed. Cells: time share / op-cost share.\n');
  const names = [...P.keys()];
  out.push(`| workload | ${CLASSES.filter((c) => eng === 'libauth' || c !== 'VM loop/accounting').join(' | ')} | ns/op-cost by class (mul/div/mod; hashing; sigcheck; stack+push+bytes; control) |`);
  out.push(`|---|${CLASSES.filter((c) => eng === 'libauth' || c !== 'VM loop/accounting').map(() => '--:').join('|')}|---|`);
  for (const n of names) {
    const r = P.get(n);
    const T = {}, C = {};
    let tt = 0, ct = 0;
    for (const [op, [cnt, ns, cost]] of Object.entries(r.profile)) {
      const k = classOf(op);
      const t = Math.max(0, ns - cnt * (r.timerOverheadNs ?? 0));
      T[k] = (T[k] ?? 0) + t; C[k] = (C[k] ?? 0) + cost; tt += t; ct += cost;
    }
    const per = (ks) => { const t = ks.reduce((a, k) => a + (T[k] ?? 0), 0), c = ks.reduce((a, k) => a + (C[k] ?? 0), 0); return c ? fmt(t / c, 3) : '-'; };
    summary.profiles[`${eng}:${n}`] = { T, C, tt, ct };
    const cells = CLASSES.filter((c) => eng === 'libauth' || c !== 'VM loop/accounting').map((k) => (T[k] || C[k] ? `${fmt(((T[k] ?? 0) / tt) * 100, 0)}/${fmt(((C[k] ?? 0) / ct) * 100, 0)}` : '-'));
    out.push(`| ${n.replace(/^vmb:/, '')} | ${cells.join(' | ')} | ${per(['mul/div/mod'])}; ${per(['hashing'])}; ${per(['sigcheck'])}; ${per(['stack', 'push', 'bytes/serialization'])}; ${per(['control'])} |`);
  }
};
profTable('bchd');
profTable('libauth');
writeFileSync(`${dir}/results/summary.md`, out.join('\n') + '\n');
writeFileSync(`${dir}/results/summary.json`, JSON.stringify(summary, null, 1));
console.log(out.join('\n'));
