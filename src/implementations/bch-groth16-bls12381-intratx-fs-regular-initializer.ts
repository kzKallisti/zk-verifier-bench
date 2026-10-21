// Current-BCH BLS12-381 FS-PIT,11 P2SH32 inputs, all21 logical stages.
// Qualified source:78857ef6f8539d1d5bd804de2c67e873881e99b1; owner SHA256:f30cd4fc0915656498eaaf46d8df8bf508d7edf7310c9e17bac8150dd10e122f.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; flags/funding in vector.
// 62945 script B +493 overhead B =63438 challenge B.
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
// Native primary:38166505/38342377; maxima:49783149/50137581;
// minimum margins:6186/298 consensus/standard.
// Ten normal exports reject3140 owning/whole controls. Actual native:
// 948 contexts,220 reconciled input prices; failed whole prices null.
// All150 old11 invalids/307 direct prior-origin records and157
// current source cases retained as150 distinct transactions;7 hash flips.
// Historical origins nested intact. Existing adapter body exact; other entries unchanged.
// Fourteen previous complete normal reports reproduce exactly with final-total off.
// FS-PIT/exactG2/pairing-equivalentG1 grades unchanged. Finite corpus only;
// no universal resource/soundness, newredteam, uniqueG1 or live admission claim.
// Vector SHA256:09e65e0f73b1b7a87a6bcde88a28f57570ed2f0a145c42f80bb05aa41b983161.
// Locking SHA256 by physical input:
// 0: b1cfba598ef330ad1c70d656e196750fa37f9c2e4b5754e6d870f2936068bbfc
// 1: cfe690819bf190e40fee43bf09dd8f2a3736d17f226d0957eb932a4a13f23ee2
// 2: 07bacbef9cf9fcc2d515ade68c3c8f12789f23f279c96bab93b0285505e4c4aa
// 3: 718ae6bf3caadf689a573ac21295d86c7a0588b8cbbe1ae5099717970a21a255
// 4: d438b8203e227ad41e7fc110b4fa5aa43189944603d662fc98115c2a785b2334
// 5: ae760e4288a009a90ab0ae6b2ab91a5741eb9aa3113fae3d30313fa7fe306d23
// 6: 980bd606ff443dd93bef8dade487fd57780d2dba01403384bfefee9b3c4f917d
// 7: 0adb2d1d21abee60901e80511fcbb2d6634c07421800127bbd010545aac274f3
// 8: f40778aff5a308a5a2ed54c83a00c993d8dd5c7ea82365e8c597336f0a1ab10d
// 9: 0606b8ec24199ce8076032b935149cda305df77fd14691f384ab14cb499d137a
// 10: 1f7627d12408e27dae2438ed029a823ffa76eba36b27f63d9df332edd16a0bb4
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
