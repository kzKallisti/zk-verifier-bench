// BCH-native BN254 PairFold-5 densless terminal-factor candidate, recovered from the published 33,179 deployment.
// Terminal/shared ID compaction, terminal simplification, genesis dedup, genesis factoring and terminalSubsequenceB give score 33,003.
// The first four input roots remain unchanged; the terminal root changes. Dynamic call sites and fixed deployment boundaries are preserved.
// Owning source: groth16_cashscript/chunked/bn254/densless-recovered.
// Fixed deployed public VK/tag; historical compiler and arbitrary-VK emission remain unrecovered.
// Five positive/nine negative fixtures pass the frozen Libauth current/spec transaction gates; native/resource evidence remains separate.
// Four binding seams tested; supplied-corpus checks do not establish universal soundness.
// Official score 33,003, script 32,768, modeled operation cost 19,478,472.
// Native base-100 consensus 19,492,370 / standard 19,558,674; DEFINE storage 13,898 bytes.
// Absolute cached VerifyScript and VMLA-relative verification wall times remain unmeasured;
// any native whole-process diagnostic is not verification timing.
// Vector SHA256: c8aff2ee74b03940b5fa165ca95d66dc0862f81f6d0e6db0bfe3350f72a108be.
// Input 0 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 1 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 2 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 3 locking SHA256: 886960db2f0bea738d1bbe40b2f304031d16e514c3d9b417412bf80d87c1a8df
// Input 4 locking SHA256: f8b3e457ce106a8d2f103c0748863cac84d0cfc14ec3d46f4be6fb0eee96c469
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti;
// subsequent publication assistance by Codex. Op-cost research remains experimental.
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless terminal-factor (score 33003)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless terminal-factor). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 33003 (scriptBytes 32768 + tx overhead 235); terminalSubsequenceB preserves fixed IDs, dynamic call sites and deployment boundaries. Op-cost and native controls remain experimental.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
