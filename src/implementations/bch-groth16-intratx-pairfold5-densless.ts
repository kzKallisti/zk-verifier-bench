// BCH-native BN254 PairFold-5 densless public-offset candidate, recovered from the published 33,179 deployment.
// Reviewed Z4 source/export bytes: score 32,774, script 32,539, spending transaction 32,599, five inputs.
// Latest reduction is 229 bytes versus 33,003; total reduction is 405 versus the published 33,179 score.
// Shared/executor commitments and terminal locking change; the genesis locking remains unchanged.
// Owning source: groth16_cashscript/chunked/bn254/densless-recovered.
// Fixed public VK/tag and public-only producer; historical compiler and arbitrary-VK emission remain unrecovered.
// Current/spec consensus/standard supplied controls: candidate 72 whole-TX contexts, 20 accept and 52 reject,
// including 16 proof-splice rejects; 360 scheduled input evaluations. Both sides together: 144 contexts/720 calls.
// Official current/spec correctness, standardness, compatibility and four binding seams pass; finite evidence only.
// Modeled canonical operation cost 19,702,166 (+223,694 versus 33,003); native B100 consensus 19,715,377 / standard 19,780,145.
// Separate native gate: 36 contexts per side (10 accept/26 reject), 122 observed inputs; minimum standard margin 30,978.
// Raw aggregate FAIL/KeyError(0) retained; independent offline correction validates all five successful jobs.
// No cached VerifyScript timing exists for this candidate; predecessor timings must not be transferred.
// No full-node/live-network admission, universal soundness, VM-memory ceiling or op-cost recommendation is claimed.
// Vector SHA256: ac9ae6eb69f589e9c0974e4294ac82ee19910b4b22f82d71ea683a0977fa0a15.
// Input 0 locking SHA256: 0912bc8a74d31008764ddcfc0b2039d3963791b34999117dc8b5a081322f52bc
// Input 1 locking SHA256: 0912bc8a74d31008764ddcfc0b2039d3963791b34999117dc8b5a081322f52bc
// Input 2 locking SHA256: 0912bc8a74d31008764ddcfc0b2039d3963791b34999117dc8b5a081322f52bc
// Input 3 locking SHA256: 886960db2f0bea738d1bbe40b2f304031d16e514c3d9b417412bf80d87c1a8df
// Input 4 locking SHA256: 5ee32b7e51c28828bb86dec76f07d018e951b80a289d197ef9c49cb22d7a2b6f
// Historical AI-assisted source recovery: GPT-6 Astra, directed by Kallisti; subsequent source/research/publication assistance by Codex.
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless public-offset (score 32774)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless public-offset). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 32774 (scriptBytes 32539 + tx overhead 235; spending bytes 32599); public-offset shared-program reduction with updated slice offsets and P2SH32 commitments. Fixed public VK; finite supplied-corpus gates, experimental op-cost research; completed finite native review with offline postprocessor correction; candidate timing unmeasured.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
