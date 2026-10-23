// SI-GLS: a sound-by-construction BN254 Groth16 verifier in ONE P2SH32 input, graded on the PROPOSED
// bch-spec VM (100,000-byte scripts, op-cost budget (10,000 + unlocking) * 800 per input).
// One batched torus identity at +-z: the Miller loops of (-A, B) and (C, delta), the GT-GLS fold of
// e(vk_x, gamma) (public inputs bound through hashed, range-checked sub-scalars and an exact mod-r check),
// and a torus residue root, checked by Schwartz-Zippel with every evaluation computed on-chain. Statement:
// full Groth16 under the fixed VK of the locking, public inputs n0, n1 packed in push 1 (WS) at bytes
// 256 and 288, 32-byte little-endian (canonical: 0 <= n < r enforced on-chain).
// Owning source: chunked/bn254/sound-si-gls in groth16_cashscript.
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

interface RawStep {
  label: string;
  locking: string;
  unlocking: string;
  checkpoint?: string;
}

interface Vectors {
  steps: RawStep[];
  extraValidProofs?: RawStep[][];
  worstCaseProof?: RawStep[];
  invalid?: RawStep[][];
}

const vectors = JSON.parse(
  readFileSync('src/bch/groth16-sound-si-gls-single-vectors.json', 'utf8'),
) as Vectors;

const toRun = (raw: RawStep[]): Step[] => {
  const inputs = raw.map((step) => ({
    lockingBytecode: hexToBin(step.locking),
    unlockingBytecode: hexToBin(step.unlocking),
    valueSatoshis: 1000n,
    sequenceNumber: 0,
  }));
  return raw.map((step, index) => ({
    label: step.label,
    lockingBytecode: inputs[index]!.lockingBytecode,
    unlockingBytecode: inputs[index]!.unlockingBytecode,
    checkpoint: step.checkpoint,
    valueSatoshis: 1000n,
    sequenceNumber: 0,
    intraTx: { index, inputs },
  }));
};

export const bchGroth16SoundSiGlsSingle: Implementation = {
  id: 'bch-groth16-sound-si-gls-single',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [
    { input: 0, push: 1, name: 'n0', offset: 256, encoding: 'le32' },
    { input: 0, push: 1, name: 'n1', offset: 288, encoding: 'le32' },
  ],
  name: 'BCH Groth16 SI-GLS single torus identity (sound by construction), single input (bch-spec)',
  vm: 'bch-spec',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Single-identity BN254 Groth16 verifier: one batched odd torus identity at +-z over 33 committed monic ' +
    'states, GT-GLS folding of e(vk_x, gamma), projective B with exact G2 endpoint check, every accept-relevant ' +
    'value computed on-chain, baked, hash-committed before its challenge, or exactly checked ' +
    '(chunked/bn254/sound-si-gls); graded on the proposed bch-spec VM.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
  }),
};
