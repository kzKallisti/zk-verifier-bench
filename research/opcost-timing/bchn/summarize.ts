// Summarize a rig results.jsonl into markdown tables (stdout) and a compact CSV.
//   npx tsx research/opcost-timing/bchn/summarize.ts <results.jsonl> [out.csv]
import { readFileSync, writeFileSync } from 'node:fs';

const [file, csv] = process.argv.slice(2);
const rows = readFileSync(file!, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ok = rows.filter((r) => !r.error && r.asExpected && r.verifyStats);
const bad = rows.filter((r) => r.error || !r.asExpected);
const base = ok.find((r) => r.id === 'base-trxhzt-like');
const fmt = (x: number | undefined, d = 3) => (x === undefined ? '-' : x.toFixed(d));
const cat = (r: any) => {
  if (r.group === 'baseline' || r.group === 'sound-native') return r.group;
  const g = String(r.group).replace(/\.vmb_tests\.json$/, '').replace('bch_2026_', '');
  return g;
};
const line = (r: any) => {
  const perTxUs = r.nsPerTx / 1e3;
  const budget = r.budgetPerInput.reduce((s: number, x: number) => s + x, 0);
  return `| ${r.id} | ${cat(r)} | ${r.txBytes} | ${r.inputs} | ${r.opCostPerTx.toLocaleString('en')} | ${fmt(r.opCostPerTx / budget, 2)} | ${r.copies} | ${fmt(perTxUs, 1)} | ${fmt(r.verifyStats.spreadPct, 1)}% | ${fmt(r.nsPerOpCost)} | ${fmt(r.nsPerTxByte, 1)} | ${base ? fmt(r.nsPerTx / base.nsPerTx, 2) : '-'} |`;
};
const hdr = '| workload | set | tx B | in | op-cost/tx | op/budget | K | µs/tx (median) | spread | ns/op-cost | ns/tx-byte | × baseline tx |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
console.log(`${rows.length} rows, ${ok.length} timed & as expected, ${bad.length} not (errors / mismatches)\n`);
console.log('## baselines + sound-native\n'); console.log(hdr);
for (const r of ok.filter((r) => r.group === 'baseline' || r.group === 'sound-native')) console.log(line(r));
const vmb = ok.filter((r) => r.group !== 'baseline' && r.group !== 'sound-native');
console.log('\n## VM-limits benchmark vectors: top 15 by ns/op-cost (op-cost >= 10,000/tx)\n'); console.log(hdr);
for (const r of [...vmb].filter((r) => r.opCostPerTx >= 10000).sort((a, b) => b.nsPerOpCost - a.nsPerOpCost).slice(0, 15)) console.log(line(r));
console.log('\n## VM-limits benchmark vectors: top 15 by ns per tx byte (the byte-tied worst cases)\n'); console.log(hdr);
for (const r of [...vmb].sort((a, b) => b.nsPerTxByte - a.nsPerTxByte).slice(0, 15)) console.log(line(r));
console.log('\n## VM-limits benchmark vectors: top 15 by µs per tx\n'); console.log(hdr);
for (const r of [...vmb].sort((a, b) => b.nsPerTx - a.nsPerTx).slice(0, 15)) console.log(line(r));
// per-set maxima
console.log('\n## per vector set: max ns/op-cost (op-cost >= 10,000), max ns/tx-byte, count\n');
console.log('| set | n | max ns/op-cost (id) | median ns/op-cost | max ns/tx-byte (id) |\n|---|---|---|---|---|');
const sets = [...new Set(ok.map(cat))];
for (const s of sets) {
  const rs = ok.filter((r) => cat(r) === s); const big = rs.filter((r) => r.opCostPerTx >= 10000);
  const mo = big.sort((a, b) => b.nsPerOpCost - a.nsPerOpCost)[0];
  const meds = big.map((r) => r.nsPerOpCost).sort((a, b) => a - b);
  const mb = [...rs].sort((a, b) => b.nsPerTxByte - a.nsPerTxByte)[0];
  console.log(`| ${s} | ${rs.length} | ${mo ? `${fmt(mo.nsPerOpCost)} (${mo.id})` : '-'} | ${meds.length ? fmt(meds[Math.floor(meds.length / 2)]) : '-'} | ${fmt(mb.nsPerTxByte, 1)} (${mb.id}) |`);
}
if (bad.length) {
  console.log('\n## not timed / mismatched\n');
  for (const r of bad) console.log(`- ${r.id} (${cat(r)}): ${r.error ?? `expect=${r.expect} libauth=${r.libauthOk}${r.libauthError ? ' (' + r.libauthError + ')' : ''} bchn=${r.bchnAccepted} ${r.submitResult ?? ''}`}`);
}
if (csv) {
  const cols = ['id', 'set', 'expect', 'libauthOk', 'bchnAccepted', 'asExpected', 'txBytes', 'inputs', 'opCostPerTx', 'budgetPerTx', 'copies', 'verifyMedianMs', 'verifyMinMs', 'verifyMaxMs', 'reps', 'submitVerifyMs', 'nsPerTx', 'nsPerOpCost', 'nsPerTxByte', 'description'];
  const out = [cols.join(',')];
  for (const r of rows) {
    if (r.error) continue;
    out.push([r.id, cat(r), r.expect, r.libauthOk, r.bchnAccepted, r.asExpected, r.txBytes, r.inputs, r.opCostPerTx, r.budgetPerInput.reduce((s: number, x: number) => s + x, 0), r.copies,
      r.verifyStats?.median ?? '', r.verifyStats?.min ?? '', r.verifyStats?.max ?? '', r.verifyStats?.n ?? 0, r.submitVerifyMs ?? '', r.nsPerTx ?? '', r.nsPerOpCost ?? '', r.nsPerTxByte ?? '',
      JSON.stringify(r.description)].join(','));
  }
  writeFileSync(csv, out.join('\n') + '\n');
}
