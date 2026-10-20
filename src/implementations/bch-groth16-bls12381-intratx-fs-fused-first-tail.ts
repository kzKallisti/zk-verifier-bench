// Current-BCH BLS12-381 FS-PIT,10 P2SH32 inputs, all21 logical stages.
// Qualified source:d2bf864f84aaf88939a0f5cf3476806fe93c627e; owner SHA256:6a2ff54499fc5d5c070e4fdb5e22c7f19d926c74ea544414f1351354a31c5745.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; flags/funding in vector.
// 63228 script B +450 overhead B =63678 challenge B.
// RPA_BUNDLE_REGULAR_MAIN=1: cached initializer794->2919B includes exact2120Bmain16.
// Cacheid15 is unused by all existing nested literal definitions/calls; newguard pins it.
// Proxies use one initializer window; outermain definition and secondwindow removed.
// Raw535/774/257 bodies and all proof/witness/public/root/quotient/aux/state/challenge values fixed.
// Source51fundtopups togroups5/8/11/16 leave55Bnet saving from106rawB.
// Native primary:38654180/38830692; maxima:50301904/50656976;
// minimum margins:6117/101 consensus/standard.
// Ten normal exports reject3440 owning/whole controls. Actual native:
// 1028 contexts,200 reconciled input prices; failed whole prices null.
// All160 old10 invalids/322 direct prior-origin records and172
// current source cases retained as160 distinct transactions;8 hash flips.
// Historical origins nested intact. Existing adapter body exact; other entries unchanged.
// Old10/11 and eight other normal reports reproduce exactly with newflagoff.
// FS-PIT/exactG2/pairing-equivalentG1 grades unchanged. Finite corpus only;
// no universal resource/soundness, newredteam, uniqueG1 or live admission claim.
// Vector SHA256:7ededb656dda99ff4f70f5a00e9ba479d1607c4c49b7dc4353e9d7baa5407fa1.
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
