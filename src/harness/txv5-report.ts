// Print the TXv5-as-written grade (harness/txv5.ts) of every bch-spec entry, or of the ids
// given as arguments (exact match). `pnpm txv5 [id ...]`. Does not touch results.json.
import { REGISTRY, runScore } from './benchmark.js';
import { txv5Grade } from './txv5.js';

const ids = process.argv.slice(2);
const impls = REGISTRY.filter((i) => i.vm === 'bch-spec' && (ids.length === 0 || ids.includes(i.id)));
if (impls.length === 0) { console.error(`no bch-spec entry matches ${ids.join(', ')}`); process.exit(1); }
for (const impl of impls) {
  const scenario = await impl.load();
  const t0 = Date.now();
  const g = txv5Grade(scenario, scenario.bsvOpReturnTerminator === true, runScore);
  const shipped = runScore(scenario.valid).score;
  console.log(JSON.stringify({ id: impl.id, shippedScore: shipped, seconds: (Date.now() - t0) / 1000, ...g }, null, 2));
}
