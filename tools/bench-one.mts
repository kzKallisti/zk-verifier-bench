// Exact-id benchmark driver: runs the full harness (gates included) for ONE implementation id and prints the
// verdict-relevant fields of its BenchmarkResult as JSON.   npx tsx tools/bench-one.mts <exact id>
import { benchmark, REGISTRY } from '../src/harness/benchmark.js';

const id = process.argv[2];
const impl = REGISTRY.find((i) => i.id === id);
if (!impl) { console.error(`no implementation with id ${id}`); process.exit(1); }
const r = benchmark(impl, await impl.load());
const { impl: _impl, steps, ...rest } = r;
console.log(JSON.stringify({ id, reviewStatus: impl.reviewStatus, ...rest, steps: steps.map((s) => ({ label: s.label, lockingBytes: s.lockingBytes, unlockingBytes: s.unlockingBytes, padBytes: s.padBytes, txOverheadBytes: s.txOverheadBytes, operationCost: s.operationCost, accepted: s.accepted, error: s.error })), score: r.totalBytes + r.totalTxOverheadBytes }, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 1));
