// Current-BCH BLS12-381 FS-PIT: nine P2SH32 inputs, all21 logical stages.
// Source b1f17f42c20a999b587219703a82705dc9591224; owner SHA256 3c04913d39591b9cd2186c330c31bac4e0518ed850186103854e3c69c33b4158.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; full build flags in vectors.
// 60219 script + 407 overhead = 60626 challenge bytes.
// Immutable inline root checks pin the final ordered eight-worker locking set.
// Root owns the quotient head; complete coordinator code is imported only after
// that binding, from four existing funding pushes and one FirstTail data push.
// Imported code excludes its expected worker hash: no cryptographic fixed point.
// Each input caches the root's first870 header/statement bytes under raw key0x67.
// Cache body is one literal PUSHDATA2 data push; witness bytes are never executed.
// Only guarded bounded header/statement reads use it; full-root readers unchanged.
// All46 old argument pushes,21 logical stages, transcript/equations/verdict fixed.
// Native primary C/STD 37855684/38025924;
// maximum 49501698/49850498; minimum sampled
// per-input margins 54639/48751.
// Ten normal exports,3520 source checks;1072 native
// contexts,180 reconciled positive input prices; failures null.
// All164 old invalids/336 direct origins and176 current source cases retained,
// including four relocated old carrier attacks and ten new carrier controls.
// Complete byte-identical transaction dedup only; all nested origins preserved.
// Existing FS-PIT,exact-G2/cofactor-equivalent-G1 and security grades unchanged.
// Finite supplied corpus: no universal resource/soundness or live relay claim.
// Locking-set SHA256 98c241a309b4ca66b8e2afc18fbfa3b9e5d2623486184a523e8bca13283b9b16; vector SHA256 b1d20de1df316a245aaa8916a829fc8404e2bfb45362aa527a1a75d413110a54.
// Input 0 locking SHA256 f5ee35ffa005ea081b5ce3f635e52d8892e55171817f219125476f3688c58288.
// Input 1 locking SHA256 f1d2858a69e10f31b34bc2e7d46dce0d134051f89c64b2ffdf83b73db0b4cf67.
// Input 2 locking SHA256 59aecca8cfbf79a3c3d5122da20be5ef754bf6017b1f56830c1afd9f50347a62.
// Input 3 locking SHA256 d6ec654d6a2f97adb4c3f869aff911dddf76a7078f9479c14f1cb5438ed3073c.
// Input 4 locking SHA256 1c2c333bf341f37fbfa32c0ec20f690bacf9d50ea0442c6f8f9e28b4e5e50d39.
// Input 5 locking SHA256 4cdf048a66ed188a667d0c713233a72428f1f9951526250ad50609bb06c4f826.
// Input 6 locking SHA256 ff13bd3693311d1bb45bb647dd9b9c7b98b1745f92632ee4109e5b8c0573394e.
// Input 7 locking SHA256 9de16eb9f68a374a86aec960ca324986d38e4eb10f117128386a7a601766a862.
// Input 8 locking SHA256 356e2e9e0725d68279c06a572addd9f2e62f9b9a7310e4250244d619a1dd6609.
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
  'src/bch/groth16-bls12381-intratx-fs-fused-coordinator-head-vectors.json',
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

export const bchGroth16Bls12381IntratxFsFusedCoordinatorHead: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-fused-coordinator-head',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT with Regular initializer and fused coordinator/quotient head and bounded prefix cache (9 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The unchanged 528-byte arithmetic initializer is carried by the Regular representative. The externally anchored coordinator commits to the 8 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator shares input0 with the quotient head and caches only the bounded encoded header/statement as a literal data push. It also pins the ' +
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
