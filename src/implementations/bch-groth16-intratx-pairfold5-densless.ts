// BCH-native BN254 PairFold-5 densless, recovered from the published 33,179 deployment.
// Terminal/shared ID compaction, terminal simplification and genesis dedup give score 33,071.
// Genesis ID 10 had the same body as ID 2; its 19 calls now reuse ID 2. Other IDs are preserved.
// Owning source: groth16_cashscript/chunked/bn254/densless-recovered.
// Fixed deployed public VK/tag; historical compiler and arbitrary-VK emission remain unrecovered.
// Five positive/nine negative fixtures pass complete Libauth and BCHN 29.2.0 transaction gates.
// Four binding seams tested; supplied-corpus checks do not establish universal soundness.
// Official cost 19,469,868; native base-100 consensus 19,483,750 / standard 19,550,310.
// Pinned Libauth 3.1.0-next.8 omits the separate 13,882 DEFINE-body storage charge.
// Vector SHA256: b94547464004ec40c197cc04450052d83fe46958b1d5336bcb6c995f6653596f
// Input 0 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 1 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 2 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 3 locking SHA256: bf38eff659f81ff4e8a83c8ea0aaca01a633cee9613857c6aa6aad0c68dce94e
// Input 4 locking SHA256: 1e40026d7d990a1d26848de875be8051a1cdd6dd170fa55e9d19676e34d43584
// Historical AI-assisted research and implementation: GPT-6 Astra, directed by Kallisti.
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless natural0 (score 33071)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless natural0). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 33071 (scriptBytes 32836 + tx overhead 235); genesis helper dedup preserves numeric IDs. Sibling of pevalfuse 39691 / RC 44968.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
