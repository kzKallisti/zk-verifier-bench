// BCH-native BN254 PairFold-5 densless bounded-slice candidate.
// Completed finite package: score 32,457, script 32,222, spending 32,282, five inputs.
// Genesis IDs 19 -> 8, 20 -> 11 and 25 -> 10 save 7 + 3 + 5 bytes from 32,472.
// The range-checked two-SPLIT reader remains unchanged. Input 2
// field cursors are 3427 and 4358 bytes. Fixed public VK/tag and public-only
// producer; fixed-deployment vectors match the source. Vector SHA256:
// defd159fe40004f31cccfcab939b96c8325165f2e8ede520fde633b810c47759.
// Matched baseline/candidate current/spec controls: 144 whole-TX contexts
// (40 accepted, 104 rejected) and 720 scheduled input evaluations.
// official proof suite 4/4 proof-generality plus separate worst case, 5 generic
// negatives, 4 point negatives, 4 binding seams and 2 typechecks.
// Current native: 36 contexts/side (10 accept/26 reject), 122 actual input calls/side.
// Both sides: 72 contexts, 20 accept/52 reject, 244 actual input calls; Libauth
// modeled 20,023,512; native 20,035,625 consensus / 20,099,113 standard.
// Minimum accepted native margins: 14,202 consensus / 634 standard (input 3).
// Vector contains the fixed-deployment positive and negative scenarios.
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti;
// current source and publication assistance: GPT-6.1 Sol, directed by Kallisti.
// Locking SHA256 input 0: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 1: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 2: cc62765bc3acd84cad017515ac06b4cf1ccfe72f4b51fe4efc76b3faa3e02ef8
// Locking SHA256 input 3: e57f89a2962c5ebb381cc6b95a67947ec694d313031d676833aff74aa91e4a24
// Locking SHA256 input 4: c44e4b5c9eee1e35b941da2c88941762bef07f64bc74d9c453fa1a10ed6d2dac
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless bounded slice (score 32457)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless public-offset). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 32457 (scriptBytes 32222 + tx overhead 235; spending bytes 32282); range-checked shared input reader, unchanged input 2 cursors and regenerated genesis/terminal P2SH32 commitments. Fixed public VK; authenticated finite supplied-corpus/current-rule native gates only.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
