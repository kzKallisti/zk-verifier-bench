// BCH-native BN254 PairFold-5 densless bounded-slice candidate.
// Completed finite package: score 32,507, script 32,272, spending 32,332, five inputs.
// The current function-ID remap 25 <-> 7 saves 5 bytes from the prior 32,512
// candidate; the range-checked two-SPLIT reader remains unchanged. Input 2
// field cursors are 3427 and 4358 bytes. Fixed public VK/tag and public-only
// producer; fixed-deployment vectors match the source. Vector SHA256:
// 8b6ae14b4a8283ca5120144f5c66f51c7d78509a8cd8cb2a7aebda8c33251180.
// Matched baseline/candidate current/spec controls: 144 whole-TX contexts
// (40 accepted, 104 rejected) and 720 scheduled input evaluations.
// official proof suite 4/4 proof-generality plus separate worst case, 5 generic
// negatives, 4 point negatives, 4 binding seams and 2 typechecks.
// Current native: 36 contexts/side (10 accept/26 reject), 122 actual input calls/side.
// Both sides: 72 contexts, 20 accept/52 reject, 244 actual input calls; Libauth
// modeled 20,024,168; native 20,036,281 consensus / 20,099,769 standard.
// Vector contains the fixed-deployment positive and negative scenarios.
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti;
// current source and publication assistance: GPT-6.1 Sol, directed by Kallisti.
// Locking SHA256 input 0: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 1: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 2: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 3: 886960db2f0bea738d1bbe40b2f304031d16e514c3d9b417412bf80d87c1a8df
// Locking SHA256 input 4: 768bf50e8988f3de0e5c66df03eb5c936b72dd222a250717bdfea33e26486c7a
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
  readFileSync('src/bch/groth16-intratx-pairfold5-densless-vectors.json', 'utf8'),
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

export const bchGroth16IntratxPairfold5Densless: Implementation = {
  id: 'bch-groth16-intratx-pairfold5-densless',
  name: 'BCH Groth16 intra-tx PairFold-5 densless bounded slice (score 32507)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless public-offset). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 32507 (scriptBytes 32272 + tx overhead 235; spending bytes 32332); range-checked shared input reader, relocated input 2 cursors and regenerated executor/terminal P2SH32 commitments. Fixed public VK; authenticated finite supplied-corpus/current-rule native gates only.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
