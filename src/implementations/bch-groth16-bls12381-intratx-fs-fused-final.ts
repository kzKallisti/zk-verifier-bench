// Complete current-BCH BLS12-381 Groth16 Fiat-Shamir PIT verifier,21 P2SH32 inputs.
// Runtime statement, all21 logical Miller payloads and the complete q132 quotient
// remain committed before their original SHA-256-derived challenges.
// Regular19 and Terminal20 share one physical input; Terminal reuses the535-byte
// arithmetic library already installed by Regular. Its private/helper/main keys
// move13->113,15->115,16->116 with inverse-checked code transformations.
// B receives the exact G2 subgroup check. A/C are on-curve and pairing-equivalent;
// unique G1 encodings and the separate harness input-validation grade are not claimed.
// The unchanged FS-PIT soundness bound is less than161/2^256 in the SHA-256 ROM.
// Source: groth16_cashscript a1d6018f10b488e9eeeed0ee57e052e583bc0d42; owner SHA256 6c6b8586785f4572cb7d1b4ec8422735aad45f47da7ad2c3fe126cb937a872a9.
// Compiler: zk-language efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4.
// Same compact scheduled minus-one build as the retained22-input point, plus
// RPA_FUSE_FINAL_PAIR=1. The source removes Regular19's289-byte funding prefix;
// no new padding is added. Other configured pads and proof/witness values stay fixed.
// Primary:64,879 script B +923 transaction-overhead B =65,802 challenge B.
// Compared with retained66,172 B: -370 B; native primary standard cost+63,698.
// Native primary:38,888,974 consensus /39,070,990 standard. Maximum standard:
// 53,194,968. All10 fixed proofs pass both modes;48 native controls reject and
// all420 positive input costs reconcile. Fresh source exports reject340 controls.
// These are finite supplied-corpus results, without universal resource or live relay claims.
// Vector SHA256 4410e80cc274e82fb83259e111c2ec14298f49720f7e2bac87cc1d533eb08b1e.
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
  'src/bch/groth16-bls12381-intratx-fs-fused-final-vectors.json',
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

export const bchGroth16Bls12381IntratxFsFusedFinal: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-fused-final',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT fused final pair (21 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The externally anchored coordinator commits to the 20 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator also pins the ' +
    'proof/public-input statement, every Miller-block payload, and one logical ' +
    '132-coefficient quotient leaf. The quotient is carried as an exact ' +
    '110-coefficient head plus 22-coefficient tail and evaluated in order. The public-input ' +
    'contribution is authenticated from a table derived only from public verification-key ' +
    'points; published synthetic VK scalar relations are limited to fixture generation. ' +
    'Regular19 and Terminal20 share one physical input and installed arithmetic; the original21 logical stages and transcript leaves remain. The terminal residue relation enforces the full four-pair Groth16 equation. B receives ' +
    'an exact G2 subgroup check. A/C are on-curve and equation-binding, while unique G1 ' +
    'subgroup encodings and the separate harness input-validation grade are not claimed. ' +
    'One locking set accepts all ten supplied equation-valid fixtures. The candidate has ' +
    'finite supplied-source and current-native coverage only; complete-graph operation-cost ' +
    'and resource certification remains pending.',
  load: async () => ({
    valid: toRun(vectors.steps),
    extraValidProofs: vectors.extraValidProofs.map(toRun),
    worstCaseProof: toRun(vectors.worstCaseProof),
    invalid: vectors.invalid.map(toRun),
  }),
};
