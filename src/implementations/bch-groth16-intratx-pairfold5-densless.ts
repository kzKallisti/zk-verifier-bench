// BCH-native BN254 PairFold-5 densless, reconstructed from the published33,179 deployment.
// Terminal simplification and static terminal/shared IDs give score33,077 /19,470,286 official cost.
// Owning source: groth16_cashscript/chunked/bn254/densless-recovered.
// Fixed deployed public VK/tag; original compiler lineage and arbitrary-VK emission remain unrecovered.
// All5positive/9negative fixtures pass actual Libauth and BCHN29.2.0 transaction gates in bothmodes.
// Four binding seams tested; no universal soundness/resource theorem is inferred.
// Libauth3.1.0-next.8 omits13,885 DEFINE-body charge: native100 consensus19,484,171.
// Vector SHA256: f490a459ab2fd4a41a84b7c3b706c96f0e729d968f3970a7d32b9504626a2303
// Terminal locking SHA256: 24ecbd262126c3a74081b9c54172bb51ba7baf2f3f6daf62f85bf59c5cfaed0f
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless natural0 (score 33077)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless natural0). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 33077 (scriptBytes 32842 + tx overhead 235). Sibling of pevalfuse 39691 / RC 44968.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
