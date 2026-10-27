// Concatenate the per-singleton kernel sets into one BCHN rig source and one bchd/libauth unit list,
// and copy the six singleton units (valid proof, loosened VM) for the full-run validation.
// Usage: node assemble.mjs <kernels dir> <full units.json>
import { readFileSync, writeFileSync } from 'node:fs';
const [dir, fullUnits] = process.argv.slice(2);
const tags = ['bn-plain', 'bn-opt', 'bn-genpow', 'bls-plain', 'bls-opt', 'bls-genpow'];
const workloads = [], units = [];
for (const t of tags) {
  workloads.push(...JSON.parse(readFileSync(`${dir}/cut/${t}/kernels.json`, 'utf8')).workloads);
  units.push(...JSON.parse(readFileSync(`${dir}/cut/${t}/units.json`, 'utf8')).map((u) => ({ ...u, expectOpCost: [-1] })));
}
writeFileSync(`${dir}/all-kernels.json`, JSON.stringify({ workloads }));
writeFileSync(`${dir}/all-units.json`, JSON.stringify(units));
const names = ['bch-groth16-singleton', 'bch-groth16-singleton-opcode-optimized', 'bch-groth16-singleton-genpow', 'bch-groth16-bls12381-singleton', 'bch-groth16-bls12381-singleton-opcode-optimized', 'bch-groth16-bls12381-singleton-genpow'].map((n) => n + ':valid');
const full = JSON.parse(readFileSync(fullUnits, 'utf8')).filter((u) => names.includes(u.name));
writeFileSync(`${dir}/singleton-units.json`, JSON.stringify(full));
console.log(`${workloads.length} BCHN workloads, ${units.length} units, ${full.length} singleton units`);
