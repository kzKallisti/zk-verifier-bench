// Current-BCH BLS12-381 FS-PIT, 10 P2SH32 inputs, all 21 logical stages.
// Qualified source: 066fe2a680b54fe28fa7920b8b1a30df936cccaf; owner SHA256: 20191e3e2686df5809fed7bde98d40f285f4cc23d540e7cb3787197130e216bc.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; full buildFlags/funding in vectors.
// 62785 script + 450 overhead = 63235 total challenge bytes.
// RPA_EVAL6_PAIRED=1 requires the scheduled final-total lazy-pair Regular profile.
// Exact 534-byte owner guard: replace only the 33-byte eval6 body with 27 bytes;
// seven-field ABI unchanged, thirteen other definitions exact, library now 528 B.
// Library SHA256: 9b7339fc17c0c562c1a3eef4a5b5769e0b7eb6b92b447cf63b42e0512036254c.
// Reduce Horner after steps 1/3/5. Unsigned parsed coefficients/alpha and canonical
// field/Frobenius updates own the nonnegative domain. This preserves the polynomial
// modulo P; signed-remainder counterexamples forbid a generic signed compiler rule.
// Actual source alpha is 32 bytes; canonical two-step intermediates need at most 112 B.
// Refund 30/31/30/30 unused funding B at groups 5/8/11/16: 6 raw + 121 funding = 127 B.
// Parsing, original transcript, field/Miller/quotient equations and final verdict remain.
// All archived proof/witness/public/root/quotient/aux/state/challenge values fixed.
// Original 799-byte source arithmetic prefix and all other existing bytecode guards remain.
// Existing shared parser/extension, literal function ownership, ABI and psi checks retained.
// Native primary: 38055927/38231287; maxima: 49669831/50023751.
// Minimum sampled consensus/standard margins: 6546/786.
// Ten normal exports: 3440 owning/whole source checks. Actual native:
// 1028 contexts, 200 input-price reconciliations; failed prices null.
// 160 prior invalids / 332 direct origins, 172 source cases,
// 8 hash flips retained as 160 unique transactions; nested histories intact.
// Native owner-helper kernel: 360 C/STD contexts, protected alternate stack, independent
// polynomial expectations. Exploratory 16-partition kernel: 1,920 contexts. Whole checks separate.
// Existing adapter executable body exact. Default-off prior reports exact; spec entries unchanged.
// FS-PIT/exact-G2/cofactor-equivalent-G1 and input-validation grades unchanged.
// Finite supplied cohort only: no universal resource/soundness, new red-team or live-relay claim.
// Locking-set SHA256: bbbb07add59f9675f7ae6fad715daa09adef4bef2199ff2d73aa2465ad513b30. Vector SHA256: 55784d4fda998f9c85613504c3a267b784c790e325c04f392c8634ddf8819c3c.
import { readFileSync } from 'node:fs';

import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

interface RawStep {
  label: string;
  locking: string;
  unlocking: string;
}

interface Vectors {
  steps: RawStep[];
  extraValidProofs: RawStep[][];
  worstCaseProof: RawStep[];
  invalid: RawStep[][];
}

const vectors = JSON.parse(readFileSync(
  'src/bch/groth16-bls12381-intratx-fs-fused-first-tail-vectors.json',
  'utf8',
)) as Vectors;

const toRun = (raw: RawStep[]): Step[] => {
  const inputs = raw.map(({ locking, unlocking }) => ({
    lockingBytecode: hexToBin(locking),
    unlockingBytecode: hexToBin(unlocking),
  }));
  return raw.map(({ label }, index) => ({
    label,
    lockingBytecode: inputs[index]!.lockingBytecode,
    unlockingBytecode: inputs[index]!.unlockingBytecode,
    intraTx: { index, inputs },
  }));
};

export const bchGroth16Bls12381IntratxFsFusedFirstTail: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-fused-first-tail',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT with Regular initializer and First0/AdditionTail1 fusion (10 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The unchanged 535-byte arithmetic initializer is carried by the Regular representative. The externally anchored coordinator commits to the 9 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator also pins the ' +
    'proof/public-input statement, every Miller-block payload, and one logical ' +
    '132-coefficient quotient leaf. The quotient is carried as an exact ' +
    '110-coefficient head plus 22-coefficient tail and evaluated in order. The public-input ' +
    'contribution is authenticated from a table derived only from public verification-key ' +
    'points; published synthetic VK scalar relations are limited to fixture generation. ' +
    'First0/AdditionTail1, Regular14/AdditionMiddle15, Regular2/3 and Regular5/6/7,8/9/10,11/12/13,16/17/18 each share an input and initialized arithmetic; Regular19/Terminal20 share another; the original21 logical stages and transcript leaves remain. The terminal residue relation enforces the full four-pair Groth16 equation. B receives ' +
    'an exact G2 subgroup check. A/C are on-curve and equation-binding, while unique G1 ' +
    'subgroup encodings and the separate harness input-validation grade are not claimed. ' +
    'One locking set accepts all ten supplied equation-valid fixtures. The candidate has ' +
    'finite ten-fixture source and current-native coverage only; universal operation-cost ' +
    'and resource certification remains pending.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: vectors.extraValidProofs.map(toRun),
    worstCaseProof: toRun(vectors.worstCaseProof),
    invalid: vectors.invalid.map(toRun),
  }),
};
