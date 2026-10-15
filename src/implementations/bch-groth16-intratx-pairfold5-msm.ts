// PairFold-5 with a SOUND vk_x: the reconstructed peval-fuse verifier plus two vk_x MSM inputs.
// Owning source: chunked/bn254/pairfold5-msm in groth16_cashscript (reuses leader-recovered).
// The PairFold genesis predicate does not bind vk_x to the claimed public inputs (see
// docs/public-input-binding.md). Inputs 5-6 recompute vk_x = IC0 + n0*IC1 + n1*IC2 by GLV
// Straus from the genesis public-input pushes and require it to equal the genesis vk_x;
// the terminal requires 7 inputs and pins both MSM lockings.
// MSM written in CashScript, compiled with the mr-zwets/cashscript compiler-optimizations-5 fork.
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
  invalidInputs?: RawStep[][];
}

const vectors = JSON.parse(
  readFileSync('src/bch/groth16-intratx-pairfold5-msm-vectors.json', 'utf8'),
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

export const bchGroth16IntratxPairfold5Msm: Implementation = {
  id: 'bch-groth16-intratx-pairfold5-msm',
  name: 'BCH Groth16 intra-tx PairFold-5 with sound vk_x MSM',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'PairFold-5 peval-fuse (public-only reconstruction, chunked/bn254/leader-recovered) plus two ' +
    'CashScript GLV Straus inputs that recompute vk_x from the claimed public inputs (chunked/bn254/pairfold5-msm). ' +
    'Seven P2SH32 inputs, one standard transaction; the terminal pins input count and all worker lockings.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
  }),
};
