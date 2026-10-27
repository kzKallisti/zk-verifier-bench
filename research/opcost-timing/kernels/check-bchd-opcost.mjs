// For every kernel and control unit: bchd op-cost == libauth op-cost + executed OP_DEFINE body bytes?
// Usage: node check-bchd-opcost.mjs <kernels dir> <bchd results.json>
import { readFileSync } from 'node:fs';
const [dir, bchdPath] = process.argv.slice(2);
const tags = ['bn-plain', 'bn-opt', 'bn-genpow', 'bls-plain', 'bls-opt', 'bls-genpow'];
const meta = new Map();
for (const t of tags) for (const k of JSON.parse(readFileSync(`${dir}/cut/${t}/cut.json`, 'utf8')).kernels) {
  meta.set(`${k.id}/kernel`, { lib: k.kernelOpCost, def: k.defineBodyBytes, budget: k.budget });
  meta.set(`${k.id}/control`, { lib: k.controlOpCost, def: k.defineBodyBytes, budget: k.budget });
}
let ok = 0, bad = 0, minMargin = Infinity, worst = '';
for (const r of JSON.parse(readFileSync(bchdPath, 'utf8'))) {
  const m = meta.get(r.name); if (!m) continue;
  if (r.opCost === m.lib + m.def) ok++; else { bad++; console.log(`MISMATCH ${r.name}: bchd ${r.opCost} libauth ${m.lib} + defines ${m.def} = ${m.lib + m.def}`); }
  const margin = (m.budget - r.opCost) / m.budget; if (margin < minMargin) { minMargin = margin; worst = r.name; }
}
console.log(`bchd op-cost == libauth + OP_DEFINE body bytes: ${ok} of ${ok + bad} units; smallest budget margin under bchd accounting ${(100 * minMargin).toFixed(2)}% (${worst})`);
