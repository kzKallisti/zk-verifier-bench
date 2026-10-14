// BCH-native BN254 PairFold-5 densless bounded-slice candidate.
// Completed finite package: score 32,512, script 32,277, spending 32,337, five inputs.
// The two-SPLIT shared reader saves 17 bytes against the selected 32,529 candidate;
// both input 2 field cursors relocate with its 17-byte fragment reduction.
// Fixed public VK/tag and public-only producer; deployment outputs match vectors.
// Current/spec controls: 144 whole-TX contexts and 720 scheduled input evaluations.
// Helper controls: 152 state evaluations; functionally equivalent under resource headroom.
// Current native: 36 contexts/side (10 accept/26 reject), 122 actual input calls/side.
// Finite native costs 20,036,462 consensus / 20,099,950 standard; no network claim.
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti;
// current source and publication assistance: GPT-6.1 Sol, directed by Kallisti.
// Locking SHA256 input 0: ec30d9902cceaecd78942c5539587d2e5fe4935172bf4d698c02a7f42bfde337
// Locking SHA256 input 1: ec30d9902cceaecd78942c5539587d2e5fe4935172bf4d698c02a7f42bfde337
// Locking SHA256 input 2: ec30d9902cceaecd78942c5539587d2e5fe4935172bf4d698c02a7f42bfde337
// Locking SHA256 input 3: 886960db2f0bea738d1bbe40b2f304031d16e514c3d9b417412bf80d87c1a8df
// Locking SHA256 input 4: c62924fae50c307c7930118fc46a9e486da330288cfbc864e8a9e18ab6ccefbe
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless bounded slice (score 32512)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless public-offset). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 32512 (scriptBytes 32277 + tx overhead 235; spending bytes 32337); range-checked shared input reader, relocated input 2 cursors and regenerated executor/terminal P2SH32 commitments. Fixed public VK; finite supplied-corpus package and native resource gates.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
