// BCH-native BN254 PairFold-5 densless positive-ID base-field-helper candidate.
// Reviewed AL8 source/export and AM3 native replay: score 32,547, script 32,312,
// canonical spending bytes 32,372, five inputs. This saves 227 bytes from the
// selected 32,774 deployment.
// Shared and terminal programs use the helper; genesis remains byte-for-byte baseline.
// Fixed public VK/tag and public-only producer; deployment commitments must match vectors.
// Current/spec controls: 144 whole-TX contexts and 720 scheduled input evaluations
// across current/spec consensus/standard, including negative and binding controls.
// Completed finite native replay: 36 contexts per side (10 accept/26 reject),
// 122 observed inputs per side; no memory, full-node or universal claim.
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti;
// current source and publication assistance: GPT-6.1 Sol, directed by Kallisti.
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless base-field helper (score 32547)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless public-offset). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 32547 (scriptBytes 32312 + tx overhead 235; spending bytes 32372); positive-ID base-field helper in shared and terminal programs with regenerated slice offsets and P2SH32 commitments. Fixed public VK; finite supplied-corpus package and native resource gates.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
