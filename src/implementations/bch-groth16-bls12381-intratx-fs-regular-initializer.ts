// Current-BCH BLS12-381 FS-PIT,11 P2SH32 inputs, all21 logical stages.
// Qualified source:9cc22fdab9fa2de44b8ed6712d853d93ad96f2b3; owner SHA256:dab7cef2f49725164affdd7244e804ee2d5c1d14a017f2952754cd65cbd21ac4.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; flags/funding in vector.
// 63316 script B +493 overhead B =63809 challenge B.
// Same535/774/257 bodies, all original proof/witness/public/root/quotient/
// auxiliary/state/challenge values; Regular initializer owns the arithmetic.
// Native primary:38580292/38756932; maxima:50230704/50585904;
// minimum margins:6290/274 consensus/standard.
// Ten normal exports reject3140 owning/whole controls. Actual native:
// 948 contexts,220 reconciled input prices; failed whole prices null.
// All150 old11 invalid transactions/299 direct prior-origin records and157
// current source cases retained as150 byte-distinct transactions;7 hash flips relocated.
// Nested origin indices retain historical layouts; current source targets use11.
// FS-PIT/exactG2/pairing-equivalentG1 unchanged. Finite supplied-corpus evidence;
// no universal arbitrary-witness bound, new red-team, uniqueG1 or live claim.
// All previous entries unchanged. Vector SHA256:f6801b2c5f797a63891aee77e07d52de878ec30c1a2a6b542dc47acd15816635.
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
