// Current-BCH BLS12-381 FS-PIT: nine P2SH32 inputs, all21 logical stages.
// Source deb3d05f7c48284a4f476836b57c4c676dac5e29; owner SHA256 e2f2b3585586c02b8ca162c4479784e9bc90b391e52b80d2a01d02f93c19193f.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; full build flags in vectors.
// 60242 script + 407 overhead = 60649 challenge bytes.
// Immutable inline root checks pin the final ordered eight-worker locking set.
// Root owns the quotient head; complete coordinator code is imported only after
// that binding, from four existing funding pushes and one FirstTail data push.
// Imported code excludes its expected worker hash: no cryptographic fixed point.
// Each input caches130 encoded header bytes and740 statement bytes at raw0x67/0x68.
// Both bodies are literal data pushes (PUSHDATA1/2); witness bytes never execute.
// Only guarded bounded header/statement reads use it; full-root readers unchanged.
// All46 old argument pushes,21 logical stages, transcript/equations/verdict fixed.
// Native primary C/STD 37758450/37928690;
// maximum 49404464/49753264; minimum sampled
// per-input margins 75479/69591.
// Ten normal exports,3520 source checks;1090 native
// contexts,180 reconciled positive input prices; failures null.
// All173 old invalids/350 direct origins and176 current source cases retained,
// including ten relocated old carrier attacks and ten new carrier controls.
// Complete byte-identical transaction dedup only; all nested origins preserved.
// Existing FS-PIT,exact-G2/cofactor-equivalent-G1 and security grades unchanged.
// Finite supplied corpus: no universal resource/soundness or live relay claim.
// Locking-set SHA256 dba19685fcb3cd27f021335385b01ff9c5784b3baec1996a02ca29371218bc51; vector SHA256 609a7cf4809c6349eb74dce767ffb90ae89c3c098e9bd9bcf108fb4c35677f09.
// Input 0 locking SHA256 3c21a76a4a0796b65565efe477dc3f15e85b1c5699f19d663d804d8dd2fde8c0.
// Input 1 locking SHA256 91de4e45a074fd621b8f344c6185494de7ffdc61e908b2d57877402b1683a0fe.
// Input 2 locking SHA256 2fa8499bcebfbbd12134a754caf797acd694d2f11f18f887feffdc4cad7b1a7a.
// Input 3 locking SHA256 56d7725328c6cf041bb656cda629f780628d3b4acdd5fd0b9c6b65ab2f192501.
// Input 4 locking SHA256 2981cb0cd0f2c0458e11a04ca3aeaaac6c492dacf50bb4a1a0669b72abd5ad72.
// Input 5 locking SHA256 b2809fb0a9c9499880191feeb98dc27bedc5c4167ae83d1271a7d8d29e9fbde8.
// Input 6 locking SHA256 c4518c7bc56f6ce8b0b60bc6d6e68c955dabd8cd70f7bb0bb7fcda44b1d59e9a.
// Input 7 locking SHA256 c090f23afe7cfdef2111282e642754ec326d9026886d1400806be7bf0f34342b.
// Input 8 locking SHA256 878bc56fce8ead06bfd71497354694a826cf45806d228abf695bc3f99f8177a5.
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
  'src/bch/groth16-bls12381-intratx-fs-fused-coordinator-head-fields-vectors.json',
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

export const bchGroth16Bls12381IntratxFsFusedCoordinatorHeadFields: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-fused-coordinator-head-fields',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT with Regular initializer and fused coordinator/quotient head and separate header/statement caches (9 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The unchanged 528-byte arithmetic initializer is carried by the Regular representative. The externally anchored coordinator commits to the 8 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator shares input0 with the quotient head and caches only the bounded encoded header/statement as two literal data pushes. It also pins the ' +
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
