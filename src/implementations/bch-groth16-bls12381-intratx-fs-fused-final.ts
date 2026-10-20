// Complete current-BCH BLS12-381 Groth16 Fiat-Shamir PIT verifier,21 P2SH32 inputs.
// Runtime statement, all21 logical Miller payloads and the complete q132 quotient
// remain committed before their original SHA-256-derived challenges.
// Regular19 and Terminal20 share one physical input; Terminal reuses the535-byte
// arithmetic library already installed by Regular. Its private/helper/main keys
// move13->113,15->115,16->116 with inverse-checked code transformations.
// B receives the exact G2 subgroup check. A/C are on-curve and pairing-equivalent;
// unique G1 encodings and the separate harness input-validation grade are not claimed.
// The unchanged FS-PIT soundness bound is less than161/2^256 in the SHA-256 ROM.
// Qualified source: groth16_cashscript eeafaded5963f62553b94200537039c11b047110.
// Owner SHA256: f66f96fe50299cb5f39fd752ba6301e530f60ca4679275abf66706e4fe970363.
// Compiler: zk-language efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4.
// Compact minus-one arithmetic/profile flags remain; add RPA_SCHEDULE_COORDINATOR=1.
// RPA_FUSE_FINAL_PAIR=1; final stages share the installed535-byte arithmetic.
// Coordinator size scheduling preserves private function names/input ABIs and uses
// inverse-checked ID normalization. Same fixed proof/root/quotient/state/challenge
// values, same workers, same funding prefixes, and all prior invalid mutations.
// Primary:64680 script B +923 overhead B =65603 challenge B.
// Compared with prior same-count point:65802 B ->65603 B; -199 B and
// native primary standard cost -95,422. Maximum fixture:85763 challenge B.
// Native primary:38793936 consensus /38975568 standard;
// maximum:52719194 /53079386; minimum margins:3627 /1323.
// All10 fresh source exports pass (340 producer controls). This profile
// passes20 positive and132 negative actual native transactions;420 input costs
// reconcile. Full comparison including both old profiles:320 native contexts,
// 1,720 cost identities. Source defaults and historical artifacts remain available.
// Libauth and native prices are separate. Finite supplied-corpus evidence only;
// no universal resource bound or live relay/admission claim.
// Vector SHA256: 1836cc73b352aae71c2ff760da4bdf84678033c6c311439e2b58054f18218cee.
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
