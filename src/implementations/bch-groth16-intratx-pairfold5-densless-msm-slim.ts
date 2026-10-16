// PairFold-5 densless with a sound vk_x, SLIM MSM state (kzKallisti). Same pairing programs and the
// same GLV Straus vk_x MSM as bch-groth16-intratx-pairfold5-densless-msm; only the MSM state layout
// changes. Owning source: chunked/bn254/densless-msm-slim in groth16_cashscript (byte-exact export).
//
// Construction / what is enforced:
// - Claimed public inputs n0, n1 are the TERMINAL's own number pushes (input 4, pushes 53, 52). The
//   terminal range-checks 0 <= n < r and checks the GLV decomposition of the witness bytes w against
//   them (S0 = k10 + lambda*k20 == n0, S1 = k11 + lambda*k21 == n1 mod r).
// - w (64 bytes, one per Straus position) lives only in the terminal's state push (w, X, Y, Z;
//   exactly 160 B, required by the terminal; it is the last push before the terminal redeem, whose
//   length the locking pins). Genesis (input 3, positions 63..27) and the executors (inputs 0, 1, 2;
//   positions by OP_INPUTINDEX, cuts 37,45,54,60) read their witness bytes from that window,
//   located from the end of input 4's unlocking.
// - Each stage pins the next stage's X, Y, Z (96-B executor state push, 160-B terminal push) from the
//   end of the receiver's unlocking; the terminal finishes positions 3..0, adds IC0 - [2^64]G,
//   converts to affine with a witnessed Z inverse and requires the result to equal the genesis vk_x
//   that the Miller loop consumes. Terminal pins input count and all worker lockings.
// Soundness: every stage consumes one w, which the terminal binds to its claimed n0, n1; the X, Y, Z
// chain is pinned stage to stage, so vk_x = IC0 + n0*IC1 + n1*IC2 for the claimed inputs, and the
// pairing check uses that vk_x. A forged claim needs a forged w, which changes vk_x.
// Worst case: 30 fresh dense-witness proofs on the standard VM, peak budget use 92.6 / 89.9 / 90.3 /
// 95.8 / 86.3 % (inputs 0..4); see densless-msm-slim/sweep-results.txt in the source repo.
// No maintainer red-team file exists for this id yet (a submitter-suggested set is in the source repo).
// Locking sha256:
//   exec0+vkx-msm           9d83ca198a067dca130d2e8d2ae3031676ab2df6a3cbb90e04dca4dfdd277295
//   exec1+vkx-msm           9d83ca198a067dca130d2e8d2ae3031676ab2df6a3cbb90e04dca4dfdd277295
//   exec2+vkx-msm           9d83ca198a067dca130d2e8d2ae3031676ab2df6a3cbb90e04dca4dfdd277295
//   genesis+vkx-msm         37780495d0fe0b6197d542cc8ffbd399712dbed8b8412f79ee5a7654ac2ef365
//   terminal+vkx-msm-final  19e5d868a080416be30f4cf1b740d29413d8413696cd1440f3685eb8bec9f17b
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
  readFileSync('src/bch/groth16-intratx-pairfold5-densless-msm-slim-vectors.json', 'utf8'),
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

export const bchGroth16IntratxPairfold5DenslessMsmSlim: Implementation = {
  id: 'bch-groth16-intratx-pairfold5-densless-msm-slim',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 4, push: 53, name: 'n0' }, { input: 4, push: 52, name: 'n1' }],
  name: 'BCH Groth16 intra-tx PairFold-5 densless with sound vk_x MSM (slim MSM state)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'PairFold-5 densless (chunked/bn254/densless-recovered) with the GLV Straus vk_x MSM in a slim state layout ' +
    '(chunked/bn254/densless-msm-slim): claimed inputs are terminal pushes, witness bytes live only in the terminal state, ' +
    'executors carry X, Y, Z. Five P2SH32 inputs, one standard transaction; the terminal pins input count and all worker lockings.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
  }),
};
