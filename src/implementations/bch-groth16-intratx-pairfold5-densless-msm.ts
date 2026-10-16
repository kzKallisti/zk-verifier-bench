// PairFold-5 densless with a SOUND vk_x: the reconstructed densless verifier (kallisti, withdrawn
// bench PR #36 / source PR #17) with its dead vk_x predicate sliced out of genesis, plus a GLV
// Straus MSM that recomputes vk_x = IC0 + n0*IC1 + n1*IC2 from the claimed public inputs, carried
// in the spare op budget of the existing inputs: genesis runs
// positions 63..27, the three executors and the terminal continue it as a chain of pinned state
// pushes, and the terminal checks the result against the genesis vk_x and the GLV decomposition
// against n0, n1. Owning source: chunked/bn254/densless-msm in groth16_cashscript (MSM in
// CashScript, compiled with the mr-zwets/cashscript compiler-optimizations-7 fork).
// Slim MSM state (kzKallisti): the claimed public inputs n0, n1 are the terminal's own number
// pushes (range-checked and GLV-checked there; genesis no longer carries them), and the 64 GLV
// witness bytes w live only in the terminal's state push (w, X, Y, Z; 160 B): genesis and the
// executors read their witness bytes from that pinned window, and the executors carry only
// X, Y, Z (96 B) instead of copying n0, n1, w through every stage. Straus split 27, cuts
// 37,45,54,60 to rebalance op budgets. 35,646 -> 35,124 script bytes (-522).
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
  readFileSync('src/bch/groth16-intratx-pairfold5-densless-msm-vectors.json', 'utf8'),
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

export const bchGroth16IntratxPairfold5DenslessMsm: Implementation = {
  id: 'bch-groth16-intratx-pairfold5-densless-msm',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 4, push: 53, name: 'n0' }, { input: 4, push: 52, name: 'n1' }],
  name: 'BCH Groth16 intra-tx PairFold-5 densless with sound vk_x MSM',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'PairFold-5 densless (public-only reconstruction, chunked/bn254/densless-recovered) plus ' +
    'a GLV Straus MSM that recomputes vk_x from the claimed public inputs (chunked/bn254/densless-msm), ' +
    'carried by the existing inputs as a chain of pinned states. Five P2SH32 inputs, one standard transaction; ' +
    'the terminal pins input count and all worker lockings.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
  }),
};
