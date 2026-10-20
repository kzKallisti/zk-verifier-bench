// Complete BLS12-381 Groth16 verification in one current-BCH standard transaction.
//
// Entry name: bch-groth16-bls12381-intratx-fs-compact (intra-tx packing + Fiat-Shamir
// polynomial-identity checking). The Fp6/torus relations are checked at
// SHA-256-derived challenges rather than computed exactly, so this entry sits in
// the separate Fiat-Shamir PIT security-model category defined in
// groth16_cashscript/verifiers.md; the residue entries remain the unconditional
// frontier. "qsplit tail-22" is the internal build codename.
// Twenty-two P2SH32 inputs jointly enforce
//
//   e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) = 1,
//   vk_x = IC0 + input0*IC1 + input1*IC2.
//
// The runtime proof and public inputs are committed before the Fiat-Shamir
// challenges. Each Miller-block payload is committed before beta, and the 132
// quotient coefficients are committed as one logical leaf before alpha. The
// quotient is carried physically as a fixed 110-coefficient head followed by a
// fixed 22-coefficient tail; both consumers enforce the exact lengths, order,
// sibling programs, recurrence, and terminal residue relation.
//
// The fixed Miller data and authenticated public-input table are derived only
// from public verification-key points. The repository's published synthetic VK
// scalar relations are used only to mint equation-valid benchmark fixtures;
// locking-program compilation and table generation do not consume them. No
// proof value, setup secret, or private witness is specialized. All ten supplied
// fixtures use the same locking set. B is checked on-curve and in the exact
// order-r G2 subgroup by the psi relation with the mid-walk nonzero guard. A and
// C have canonical field encodings and are checked on-curve; cofactor-equivalent
// G1 points remain equivalent for the pairing verdict, so this entry does not
// claim a separate unique-G1-encoding grade. These vectors also do not supply
// isolated point-validation runs, so the entry does not claim the harness's
// separate input-validation grade.
//
// The 24 pre-beta relations have cancellation degree at most 23, and the alpha
// identity has degree at most 137. In the SHA-256 random-oracle model, the
// conservative union bound is 160/(2^256-1), less than 161/2^256.
//
// Qualified source: groth16_cashscript 6b014791e0407fcbeeb0c6ab208a358dbb47cb0c.
// Compiler: cashscript zk-language efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4.
// The source uses signed line numerators, three-multiply Fp2 products, a 535-byte
// arithmetic library, rescheduled mains and shared-prime calls. Terminal imports
// that library through wrapper14 before invoking its existing minus-one leaf.
// RPA_TEMPLATE_COMMON_PRIME_POOL=on and RPA_TEMPLATE_TERMINAL_PRIME_POOL=on;
// RPA_COMPACT_ARITHMETIC_PRIME_KEY=-1, RESCHEDULE=on, RPA_TEMPLATE_CASHC=dist/compiler.js.
// All earlier qsplit-tail22/compact/PIC settings remain; exact padding map:
// {3:334,5:320,6:276,7:283,8:266,9:272,10:273,11:281,12:276,13:283,14:285,16:305,17:279,18:281,19:289}.
// PIC block2 retains145 bytes; other coordinator/factor/tail/terminal pads stay0.
// Committed: 65,402 wire B /65,206 script B /66,172 challenge B.
// Maximum supplied fixture: 85,562 wire B /86,332 challenge B.
// The previous69,192-byte artifact remains available in branch history.
// One locking set accepts all10 supplied source fixtures. The source rejects540
// controls in each mode; native replay covers64 contexts (20 accepted44 rejected)
// and1,408 independently checked input pairs, with unchanged rejection paths.
// B100 native primary costs:38,824,508 consensus /39,007,292 standard;
// maximum:52,761,862 /53,123,206; minimum input margins:2,682 /378.
// Native and source/Libauth absolute prices are reported separately.
// These are finite supplied-corpus results; subgroup/cofactor posture and the
// universal resource/admission scope above remain unchanged.
// Source owner SHA256: e5a05b9ffbff445369eb264c5d2ef575faf747ab5d380498cd4c5cfcad873fdd
// Source resource export SHA256: af3d93e6de4e46d6961f54bb87b32bb7ea7f96ebad710fa64a8c7127258f9b21
// Vector SHA256: c2661e2d5d123207f00aa02c6e5cde4d12af0016d09e23bf1fc65e79df97089e
// Length-prefixed locking-set SHA256: 65de70bea10263fceea5fe91731222c0573d0eee13d6119ab605bc4632529fac
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
  'src/bch/groth16-bls12381-intratx-fs-compact-vectors.json',
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

export const bchGroth16Bls12381IntratxFsCompact: Implementation = {
  id: 'bch-groth16-bls12381-intratx-fs-compact',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 1, offset: 193, encoding: 'le32', name: 'n0' },
    { input: 0, push: 1, offset: 225, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH BLS12-381 Groth16 Fiat-Shamir PIT compact Regular (22 inputs, one standard transaction)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Complete BLS12-381 Groth16 verification in one current-BCH standard transaction. ' +
    'The externally anchored coordinator commits to the 21 worker lockings, while worker ' +
    'inputs read the required siblings with OP_INPUTBYTECODE. The coordinator also pins the ' +
    'proof/public-input statement, every Miller-block payload, and one logical ' +
    '132-coefficient quotient leaf. The quotient is carried as an exact ' +
    '110-coefficient head plus 22-coefficient tail and evaluated in order. The public-input ' +
    'contribution is authenticated from a table derived only from public verification-key ' +
    'points; published synthetic VK scalar relations are limited to fixture generation. ' +
    'The terminal residue relation enforces the full four-pair Groth16 equation. B receives ' +
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
