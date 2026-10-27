// Two BCHN workloads that show whether a node charges OP_DEFINE function-body bytes to op-cost
// (bchd commit ecc1b0ff / BCHN metrics) or not (libauth 3.1.0-next.8).
// Locking: <body: 5,000 x OP_NOP> <1> OP_BEGIN OP_2DUP OP_DEFINE OP_1ADD OP_DUP <101> OP_NUMEQUAL OP_UNTIL
//          OP_2DROP OP_DROP OP_1     (defines 100 never-invoked functions with the same 5,000-byte body)
// Unlocking: one pad push. libauth op-cost C; a node that also charges the body bytes needs C + 500,000.
//   defcharge-gap : budget (41 + U) * 800 between C and C + 500,000  -> rejected iff body bytes are charged
//   defcharge-fits: budget >= C + 500,000                             -> accepted either way
// Usage: tsx make-defcharge.ts <out.json>
import { writeFileSync } from 'node:fs';
import { binToHex, createVirtualMachineBch2026, encodeDataPush, sha256 } from '@bitauth/libauth';

const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const body = new Uint8Array(5000).fill(0x61);
const locking = cat(encodeDataPush(body), Uint8Array.of(0x51, 0x65, 0x6e, 0x89, 0x8b, 0x76, 0x01, 101, 0x9c, 0x66, 0x6d, 0x75, 0x51));
const vm = createVirtualMachineBch2026(false);
const pad = (u: number) => { for (let n = Math.max(0, u - 3); ; n++) { const p = encodeDataPush(new Uint8Array(n).fill(0x5a)); if (p.length >= u) return p; } };
const run = (unlocking: Uint8Array) => {
  const transaction = { version: 2, locktime: 0, inputs: [{ outpointTransactionHash: sha256.hash(locking), outpointIndex: 0, sequenceNumber: 0, unlockingBytecode: unlocking }], outputs: [{ lockingBytecode: Uint8Array.of(0x6a), valueSatoshis: 0n }] };
  const s = vm.evaluate({ inputIndex: 0, sourceOutputs: [{ lockingBytecode: locking, valueSatoshis: 1000n }], transaction } as any);
  return { ok: vm.stateSuccess(s), cost: s.metrics.operationCost };
};
const big = run(pad(9000));
if (big.ok !== true) throw new Error(String(big.ok));
const C = big.cost - 9000; // pad push cost is its length (approximately; recomputed below)
const uGap = Math.ceil((C + 250_000) / 800) - 41;   // budget about C + 250k: inside the gap
const uFit = Math.ceil((C + 500_000 + 20_000) / 800) - 41;
const mk = (id: string, u: number, expect: 'accept' | 'reject', desc: string) => {
  const unlocking = pad(u); const r = run(unlocking);
  const budget = (41 + unlocking.length) * 800;
  console.error(`${id}: unlocking ${unlocking.length} B, budget ${budget}, libauth op-cost ${r.cost} (${r.ok}), +body bytes ${r.cost + 500_000}`);
  return { id, group: 'defcharge', description: `${desc}; budget ${budget}, libauth op-cost ${r.cost}, with body bytes ${r.cost + 500_000}`, expect, version: 2, locktime: 0,
    inputs: [{ sourceLockingHex: binToHex(locking), valueSatoshis: 1000, unlockingHex: binToHex(unlocking), sequenceNumber: 0 }], outputs: [{ lockingHex: '6a', valueSatoshis: 0 }] };
};
writeFileSync(process.argv[2]!, JSON.stringify({ workloads: [
  mk('defcharge-gap', uGap, 'reject', '100 OP_DEFINEs of a 5,000-byte body, budget between libauth op-cost and op-cost + body bytes (expected: rejected by a node that charges body bytes)'),
  mk('defcharge-fits', uFit, 'accept', '100 OP_DEFINEs of a 5,000-byte body, budget above op-cost + body bytes'),
] }, null, 1));
