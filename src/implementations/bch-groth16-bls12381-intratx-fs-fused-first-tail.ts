// Current-BCH BLS12-381 FS-PIT,10 P2SH32 inputs, all21 logical stages.
// Qualified source:78857ef6f8539d1d5bd804de2c67e873881e99b1; owner SHA256:f30cd4fc0915656498eaaf46d8df8bf508d7edf7310c9e17bac8150dd10e122f.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; flags/funding in vector.
// 62912 script B +450 overhead B =63362 challenge B.
// RPA_FINAL_RELATION_TOTAL=1 requires the relation-fusion scheduled lazy-pair Regular profile.
// Last absorb keeps exactly mulAddFp(power,residual,total); its next power is unused.
// Each later logical stage initializes its own power; no transcript relation is removed.
// The inherited nonnegative fused-reduction domain and signed counterexamples remain.
// Regular owns exact799B source arithmetic and unchanged534B optimized shared library.
// Mixed continuations declare/define no private helpers and call only literal shared owners.
// Identity remap/inverse, exact821B parser/257B extension and ABI guards remain.
// Psi reads retain their length/offsets, with64/65/66 stack depths;616 native kernel contexts.
// Cached Regular main16 is2106B; initializer2904B. All literal-ID checks remain.
// Refund27/27/27/28 funding bytes at groups5/8/11/16;48 raw+109 funding=157B saved.
// All archived proof/witness/public/root/quotient/aux/state/challenge values fixed.
// Native primary:38257693/38433437; maxima:49871649/50225953;
// minimum margins:6198/310 consensus/standard.
// Ten normal exports reject3440 owning/whole controls. Actual native:
// 1028 contexts,200 reconciled input prices; failed whole prices null.
// All160 old10 invalids/332 direct prior-origin records and172
// current source cases retained as160 distinct transactions;8 hash flips.
// Historical origins nested intact. Existing adapter body exact; other entries unchanged.
// Fourteen previous complete normal reports reproduce exactly with final-total off.
// FS-PIT/exactG2/pairing-equivalentG1 grades unchanged. Finite corpus only;
// no universal resource/soundness, newredteam, uniqueG1 or live admission claim.
// Vector SHA256:18035f6792a89bfbcdb326062c5c532fddddb887c191cc768b505fc8cda6b04c.
// Locking SHA256 by physical input:
// 0: fbf2cc6d0406f05a0984a719599eb4455f86849ea0426787990207666b051b75
// 1: 659a411f49cc7b3df7549e523184f685830183ffb7b1a57483f8055d9ddc25f6
// 2: 22d9f6b8ae218a6ac67bb468eedcfb5b335df95a7a1f3851bb96e7b83dffedb0
// 3: 072af8929de378333f007e3a01c06c5b04ed2153901d6e426ca01285bee0bda6
// 4: 48465c327de3851211da5c328bdad70c8ee57d6c7ec9e29ba24a22ec0c18e10f
// 5: de7e1f08a62dc7e503e57613da77aa4f136c93b0d20f4aa5bd502e2ec7180eb7
// 6: 8bc7c4424f9a791ad40d071aadb0ff305c10bdea3a2996be19c094b4853b7e05
// 7: 847efb06dd19df61083cfa0c592d398a9144a645f25de214caf1604bc371047f
// 8: 598ec8171078c3e092c62d7932a8b8e581d501220f9ba2a6e53e99c166124068
// 9: 254146957d11335ff1a5460da9d4e56af876cd910119ce4ca06d34bc0f6e2eb4
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
