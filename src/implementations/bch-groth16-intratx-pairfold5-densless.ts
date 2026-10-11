// BCH-native BN254 PairFold-5 densless, recovered from the published 33,179 deployment.
// Terminal/shared ID compaction, terminal simplification and genesis dedup plus a genesis-factor helper give score 33,036.
// Genesis-factor helper ID 30 replaces 22 exact five-byte sites; genesis ID 10 had the same body as ID 2 and its 19 calls reuse ID 2. Other IDs are preserved.
// Owning source: groth16_cashscript/chunked/bn254/densless-recovered.
// Fixed deployed public VK/tag; historical compiler and arbitrary-VK emission remain unrecovered.
// Five positive/nine negative fixtures pass the frozen Libauth current/spec transaction gates; native/resource review remains separate.
// Four binding seams tested; supplied-corpus checks do not establish universal soundness.
// Official cost 19,473,867; native base-100 consensus 19,487,754 / standard 19,554,186.
// Pinned Libauth 3.1.0-next.8 omits the separate 13,887 DEFINE-body storage charge.
// Absolute cached VerifyScript and VMLA-relative verification wall times are pending;
// the native 0.1909 s process wall value is diagnostic, not verification timing.
// Vector SHA256: aa829f72a7e493b4d6c958f35b154b902c6709597bdfc0b2174c7710e346bc99
// Input 0 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 1 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 2 locking SHA256: 94439093c59aafef037700966b5b2bcf4d4ef5283bea013616861c3c4e0b65b7
// Input 3 locking SHA256: 886960db2f0bea738d1bbe40b2f304031d16e514c3d9b417412bf80d87c1a8df
// Input 4 locking SHA256: f9402b9b103990ef19711167c4dd4d12bd7ab4b4dd972eea824fc706ff8e76b1
// Historical AI-assisted source recovery; experimental opcost research and implementation: GPT-6 Astra, directed by Kallisti.
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
  name: 'BCH Groth16 intra-tx PairFold-5 densless natural0 (score 33036)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BCH-native recovered symbolic assembly: five P2SH32 inputs in one intra-transaction-linked BN254 ' +
    'Groth16 verifier (PairFold-5 densless natural0). Zero artificial density; equal-limb BQ ' +
    'residual 2336; peval-expand + aff-R-only; stock public-bench value=1000 / sequence=0. ' +
    'Score 33036 (scriptBytes 32801 + tx overhead 235); genesis factor candidate preserves the fixed IDs and dynamic call sites. Sibling of pevalfuse 39691 / RC 44968.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
    worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
    invalid: (vectors.invalid ?? []).map(toRun),
    invalidInputs: (vectors.invalidInputs ?? []).map(toRun),
  }),
};
