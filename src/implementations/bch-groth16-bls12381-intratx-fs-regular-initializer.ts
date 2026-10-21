// Current-BCH BLS12-381 FS-PIT,11 P2SH32 inputs, all21 logical stages.
// Qualified source:982645fbf76bfbd7ed4b6c86b5a5232fb3121e6c; owner SHA256:588c84c0ddd3b5e793156805e5077c03213ce70f1bee107444dd3b89e88605f8.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; flags/funding in vector.
// 63102 script B +493 overhead B =63595 challenge B.
// RPA_FUSE_RELATIONS=1 requires the scheduled lazy-pair bundled Regular/minus1 profile.
// For nonnegative operands: (total+(power*residual)%P)%P=(total+power*residual)%P.
// Unsigned parsing/power recurrence and canonical residuals preserve that domain.
// Arbitrary signed operands are outside scope; isolated signed counterexamples retained.
// Regular owns exact799B source arithmetic; optional mAdd inline expansion is checked exactly.
// Literal definition IDs, exact821B parser/257B extension and namespace inverses remain guarded.
// Private relation helper12->9B; Regular main16 is2118B and cached initializer2916B.
// The shared534B arithmetic library and existing lazy pair-product lowering remain.
// Refund11/11/11/10 funding bytes at groups5/8/11/16;13 raw+43 funding=56B saved.
// All archived proof/witness/public/root/quotient/aux/state/challenge values fixed.
// Native primary:38328424/38504680; maxima:49946186/50301002;
// minimum margins:5918/30 consensus/standard.
// Ten normal exports reject3140 owning/whole controls. Actual native:
// 948 contexts,220 reconciled input prices; failed whole prices null.
// All150 old11 invalids/307 direct prior-origin records and157
// current source cases retained as150 distinct transactions;7 hash flips.
// Historical origins nested intact. Existing adapter body exact; other entries unchanged.
// Twelve previous complete normal reports reproduce exactly with relation fusion off.
// FS-PIT/exactG2/pairing-equivalentG1 grades unchanged. Finite corpus only;
// no universal resource/soundness, newredteam, uniqueG1 or live admission claim.
// Vector SHA256:f0a996798bb0f361544931e1131a2e7f5b960e01350602fdff4ae0d44f27402b.
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
  'src/bch/groth16-bls12381-intratx-fs-regular-initializer-vectors.json',
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

export const bchGroth16Bls12381IntratxFsRegularInitializer: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-regular-initializer',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT with Regular arithmetic initializer (11 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The unchanged 535-byte arithmetic initializer is carried by the Regular representative. The externally anchored coordinator commits to the 10 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator also pins the ' +
    'proof/public-input statement, every Miller-block payload, and one logical ' +
    '132-coefficient quotient leaf. The quotient is carried as an exact ' +
    '110-coefficient head plus 22-coefficient tail and evaluated in order. The public-input ' +
    'contribution is authenticated from a table derived only from public verification-key ' +
    'points; published synthetic VK scalar relations are limited to fixture generation. ' +
    'Regular14/AdditionMiddle15, Regular2/3 and Regular5/6/7,8/9/10,11/12/13,16/17/18 each share an input and initialized arithmetic; Regular19/Terminal20 share another; the original21 logical stages and transcript leaves remain. The terminal residue relation enforces the full four-pair Groth16 equation. B receives ' +
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
