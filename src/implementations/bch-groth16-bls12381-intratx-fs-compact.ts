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
// Compact transcript/padding candidate; measured fixture coverage only.
// Owning source Git commit b1375ef46c08069b93109ab07356e148855b06e2.
// Candidate source SHA256 12877176400b6e83aff9803d0b52b19d52e079ee73f188477b6dca50b760d790 (export pin, not a Git revision); upstream base current.
// Legacy candidate provenance: 21beb8116a0fb191402160350c4bce4605a0ef95.
// The Regular payload uses a 32-byte root for each zero window and a 704-byte
// authenticated record for each nonzero window. Fixed proxy padding adds 394 B
// over the initial compact corpus. Input 3 retains its explicit 80-byte padding.
// The tested 428–442 range stays within one constant-width script-framing region.
//
// Committed candidate fixture: 69,162 wire B / 68,966 script B.
// Dense/max-size fixture: 89,322 wire B / 89,126 script B.
// Official aggregate challenge score: 69,932 B; maximum supplied-fixture
// challenge footprint: 90,092 B. The fixed 79,948 entry remains the historical
// Pareto alternative.
// Exactly three template identifiers change: 101->16, 117->15, and 104->-1;
// 102 and 103 remain unchanged. Source coverage is finite (10 fixtures, 220
// pairs). The current source/Libauth mutation corpus has 540 cases per mode;
// separate native checks cover 64 contexts (20 accepted, 44 rejected, 566 reached
// input calls).
// The unchanged harness reports committed bytes and dense operation costs
// separately; 90,092 is the derived dense footprint, not the official score.
// The current pinned source replay covers ten supplied fixtures (220 source
// input pairs); the separate benchmark vector supplies 22 full negative runs.
// These are corpus checks only. They do not establish arbitrary-witness
// producer bounds, helper closure, or a universal resource theorem.
// The prior 79,948 best entry is preserved outside this isolated candidate.
// The current candidate's native-minus-Libauth DEFINE-body difference is 99,442
// operation-cost units in each mode; the prior 99,480-unit figure remains
// historical baseline metadata.
//
// Candidate source artifact SHA256 (not a Git revision):
//   12877176400b6e83aff9803d0b52b19d52e079ee73f188477b6dca50b760d790
// Candidate pinned source resource export SHA256:
//   bd1cc2d6d5326ada44851c2b942958c6f9bf6df5908254f97188dcaa50ea7de0
// Vector SHA256 (current package metadata):
//   fc8544348062eed3aea6dd53515ec8926f82890b48c5c9ef8ce3da6fa4c9b736
// Length-prefixed locking-set SHA256:
//   b2507d6fcabe15e5f57a21f3a24bfd0db49eca78d6374166b8ada9069e87aaa1
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
