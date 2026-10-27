// Built-in workloads: simple signature/trivial baselines and the two sound-native verifier chains.
import { readFileSync } from 'node:fs';
import { hexToBin, sha256 } from '@bitauth/libauth';
import { bms1of3Locking, p2pkLocking, p2pkhLocking, pubkeyOf, type Workload } from './rig.js';

const key = (n: number) => sha256.hash(new TextEncoder().encode(`opcost-timing-rig key ${n}`));
const OPRET = { locking: Uint8Array.of(0x6a), valueSatoshis: 0n };
const p2pkhOut = (n: number) => ({ locking: p2pkhLocking(pubkeyOf(key(n))), valueSatoshis: 5_000n });

export const baselines = (): Workload[] => {
  const k1 = key(1), k2 = key(2), k3 = key(3);
  const sig = (kind: any, k: Uint8Array, locking: Uint8Array) => ({ sourceLocking: locking, valueSatoshis: 10_000n, unlocking: new Uint8Array(0), sequenceNumber: 0xffffffff, sign: { kind, key: k } });
  const bms = bms1of3Locking([pubkeyOf(k1), pubkeyOf(k2), pubkeyOf(k3)]);
  return [
    {
      id: 'base-op1', group: 'baseline', description: 'bare OP_1 input, empty unlocking (per-input fixed overhead)', expect: 'accept', version: 2, locktime: 0,
      inputs: [{ sourceLocking: Uint8Array.of(0x51), valueSatoshis: 10_000n, unlocking: new Uint8Array(0), sequenceNumber: 0xffffffff }],
      outputs: [{ locking: Uint8Array.of(0x6a, 0x10, ...new Uint8Array(16)), valueSatoshis: 0n }], // padded to the 65-byte tx minimum
    },
    {
      id: 'base-p2pkh-ecdsa', group: 'baseline', description: '1 P2PKH input (ECDSA), 1 P2PKH output', expect: 'accept', version: 2, locktime: 0,
      inputs: [sig('p2pkh-ecdsa', k1, p2pkhLocking(pubkeyOf(k1)))], outputs: [p2pkhOut(9)],
    },
    {
      id: 'base-p2pkh-schnorr', group: 'baseline', description: '1 P2PKH input (Schnorr), 1 P2PKH output', expect: 'accept', version: 2, locktime: 0,
      inputs: [sig('p2pkh-schnorr', k1, p2pkhLocking(pubkeyOf(k1)))], outputs: [p2pkhOut(9)],
    },
    {
      id: 'base-trxhzt-like', group: 'baseline', description: 'VM-limits [baseline] shape: 2 P2PKH inputs (1 Schnorr, 1 ECDSA), 2 P2PKH outputs (re-signed here)', expect: 'accept', version: 2, locktime: 0,
      inputs: [sig('p2pkh-schnorr', k1, p2pkhLocking(pubkeyOf(k1))), sig('p2pkh-ecdsa', k2, p2pkhLocking(pubkeyOf(k2)))], outputs: [p2pkhOut(8), p2pkhOut(9)],
    },
    {
      id: 'base-bms-1of3-ecdsa-bottom-x50', group: 'baseline', description: 'VM-limits sig-check worst case shape: 50 bare 1-of-3 multisig inputs, ECDSA signature for the bottom key (3 ECDSA verifies/input), 1 output', expect: 'accept', version: 2, locktime: 0,
      inputs: Array.from({ length: 50 }, () => sig('bms-1of3-ecdsa-bottom', k1, bms)), outputs: [p2pkhOut(9)],
    },
    {
      id: 'base-p2pk-schnorr-x50', group: 'baseline', description: '50 bare P2PK inputs (Schnorr), 1 output', expect: 'accept', version: 2, locktime: 0,
      inputs: Array.from({ length: 50 }, () => sig('p2pk-schnorr', k3, p2pkLocking(pubkeyOf(k3)))), outputs: [p2pkhOut(9)],
    },
  ];
};

interface RawStep { label: string; locking: string; unlocking: string }
const BENCH = process.env.BENCH_DIR ?? '.';
const chainWl = (id: string, desc: string, steps: RawStep[], expect: 'accept' | 'reject'): Workload => ({
  id, group: 'sound-native', description: desc, expect, version: 2, locktime: 0,
  // same shape as the harness (vm.ts intraTxProgram): 1000-sat inputs, sequence 0, one OP_RETURN output
  inputs: steps.map((s) => ({ sourceLocking: hexToBin(s.locking), valueSatoshis: 1000n, unlocking: hexToBin(s.unlocking), sequenceNumber: 0 })),
  outputs: [{ locking: Uint8Array.of(0x6a), valueSatoshis: 1000n }],
});
export const soundNative = (): Workload[] => {
  const out: Workload[] = [];
  for (const [tag, file] of [
    ['bn254', 'src/bch/groth16-bn254-sound-native-vectors.json'],
    ['bls12381', 'src/bch/groth16-bls12381-sound-native-vectors.json'],
  ] as const) {
    const v = JSON.parse(readFileSync(`${BENCH}/${file}`, 'utf8'));
    const id = `bch-groth16-${tag}-sound-native`;
    out.push(chainWl(`${id}:valid`, `${id} primary valid proof (${v.steps.length} inputs, one tx)`, v.steps, 'accept'));
    (v.extraValidProofs ?? []).forEach((s: RawStep[], i: number) => out.push(chainWl(`${id}:extra${i}`, `${id} extra valid proof ${i}`, s, 'accept')));
    if (v.worstCaseProof) out.push(chainWl(`${id}:worst`, `${id} worst-case proof`, v.worstCaseProof, 'accept'));
    out.push(chainWl(`${id}:invalid0`, `${id} rejection check: ${v.invalid[0][0].label}`, v.invalid[0], 'reject'));
  }
  return out;
};
