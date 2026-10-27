// Build the engine-neutral unit list (one unit = one transaction to validate) from
//  - workloads.json (export-workloads.ts: our verifiers, valid + first invalid proof), and
//  - the VM-limits benchmark vectors (libauth src/lib/vmb-tests/generated/bch_2026_{standard,nonstandard}/*benchmarks*).
// Usage: tsx make-units.ts <workloads.json> <libauth generated dir> <out units.json>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodeTransactionBch, hexToBin } from '@bitauth/libauth';

const [wlPath, vmbDir, outPath] = process.argv.slice(2) as [string, string, string];
const units: any[] = [];

const wl = JSON.parse(readFileSync(wlPath, 'utf8')) as any[];
const groups = new Map<string, any[]>();
for (const r of wl) {
  const k = `${r.id}:${r.kind}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k)!.push(r);
}
for (const [k, rs] of groups) {
  const r0 = rs[0];
  // every record of a multi-input entry shares one tx; check that
  for (const r of rs) if (r.txHex !== r0.txHex) throw new Error(`${k}: inputs do not share one tx`);
  const realOk = rs.every((r) => r.realAccepted);
  const mode = r0.vm === 'bch-spec' ? 'bchspec' : realOk || r0.kind === 'invalid' && rs.every((r) => !/density|bytecode length/.test(r.realError ?? '')) ? 'bch2026' : 'loose';
  const looseOk = rs.every((r) => r.looseAccepted);
  units.push({
    name: k, group: 'verifier', mode,
    txHex: r0.txHex, sourceOutputsHex: r0.sourceOutputsHex,
    inputs: rs.map((r) => r.inputIndex),
    expectAccept: looseOk,
    expectOpCost: rs.map((r) => (r.kind === 'valid' ? r.opCost : -1)),
    libauthOpCost: rs.reduce((a, r) => a + r.opCost, 0),
  });
}

for (const dir of ['bch_2026_standard', 'bch_2026_nonstandard']) {
  for (const f of readdirSync(`${vmbDir}/${dir}`).filter((f) => f.includes('benchmarks') && f.endsWith('.vmb_tests.json')).sort()) {
    const tests = JSON.parse(readFileSync(`${vmbDir}/${dir}/${f}`, 'utf8')) as any[][];
    const limits = JSON.parse(readFileSync(`${vmbDir}/${dir}/${f.replace('.vmb_tests.json', '.nonstandard_limits.json')}`, 'utf8'));
    const results = JSON.parse(readFileSync(`${vmbDir}/${dir}/${f.replace('.vmb_tests.json', '.nonstandard_results.json')}`, 'utf8'));
    for (const t of tests) {
      const [id, desc, , , txHex, soHex] = t as string[];
      const idx = (t[6] as number | undefined) ?? 0;
      const tx = decodeTransactionBch(hexToBin(txHex!));
      if (typeof tx === 'string') throw new Error(tx);
      const n = tx.inputs.length;
      const exp = new Array(n).fill(-1);
      exp[idx] = limits[id!][2];
      units.push({
        name: `vmb:${id}`, group: `${dir.replace('bch_2026_', '')}/${f.replace('.vmb_tests.json', '')}`, desc,
        mode: 'bch2026', txHex, sourceOutputsHex: soHex, inputs: null, primaryIndex: idx,
        expectAccept: results[id!] === true, expectOpCost: exp,
        budgetPrimary: limits[id!][1], densityPrimary: limits[id!][0],
      });
    }
  }
}
writeFileSync(outPath, JSON.stringify(units));
console.log(units.length, 'units;', units.filter((u) => u.group === 'verifier').map((u) => `${u.name}/${u.mode}`).join(' '));
