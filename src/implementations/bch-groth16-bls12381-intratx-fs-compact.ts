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
// Compact transcript/namespace candidate; measured fixture coverage only.
// Source checkout base Git commit c40e65dfc70b094fc197dd8aee782009f938165c.
// Candidate source measure SHA256 9d78d62be0afa0ba026ffe6961beb1b1b3e5040b08f7a2297b2e95d358fb5c30 (export pin, not a Git revision); published base current.
// Legacy candidate provenance: 21beb8116a0fb191402160350c4bce4605a0ef95.
// The Regular payload uses a 32-byte root for each zero window and a 704-byte
// authenticated record for each nonzero window. UD trims seven regular-padding bytes relative to the published TU point; proof, witness, math, and authenticated resource fields remain fixed.
// Input 3 retains its explicit 80-byte padding.
// The tested compact map stays within one constant-width script-framing region:
// {3:436,5:423,6:377,7:385,8:369,9:376,10:377,11:386,12:377,13:386,14:388,16:411,17:383,18:384,19:393}.
//
// Committed candidate fixture: 68,422 wire B / 68,226 script B.
// Dense/max-size fixture: 88,582 wire B / 88,386 script B.
// Official aggregate challenge score: 69,192 B; maximum supplied-fixture
// challenge footprint: 89,352 B. The fixed 79,948 entry remains the historical
// Pareto alternative.
// The inherited identifiers are 101->16, 117->15, and 104->-1. SK changes
// extra helper 103->14 and common helper 102->13 only in AdditionTail and its
// proxy; other common-helper consumers retain 102. Source coverage is finite
// (10 fixtures, 220 pairs). The current source/Libauth mutation corpus has 540 cases per mode;
// separate native checks cover 64 contexts (20 accepted, 44 rejected); reached
// input counts are retained in the native replay receipts because negative rows may stop early.
// The unchanged harness reports committed bytes and dense operation costs
// separately; 89,352 is the derived dense challenge footprint, not the official score.
// The current pinned source replay covers ten supplied fixtures (220 source
// input pairs); the separate benchmark vector supplies 22 full negative runs.
// These are corpus checks only. They do not establish arbitrary-witness
// producer bounds, helper closure, or a universal resource theorem.
// The prior 79,948 best entry is preserved outside this isolated candidate.
// Fresh native replay covers ten supplied fixtures and 22 rejection contexts in each
// consensus/standard mode. Committed native costs are 42,895,929 / 43,084,857;
// maximum supplied-fixture costs are 56,819,457 / 57,186,945; the minimum tested
// standard per-input margin is 79 operation-cost units. This is finite supplied-corpus
// evidence, not a universal resource bound.
//
// Candidate source artifact SHA256 (not a Git revision):
//   9d78d62be0afa0ba026ffe6961beb1b1b3e5040b08f7a2297b2e95d358fb5c30
// Candidate pinned source resource export SHA256:
//   68f22952453af7a4d386bce1971c2565b12ffadf7602faef771c6b71078eb7c0
// Vector SHA256 (current package metadata):
//   a8f468d177020b69adacea6e52eb0496ced177dfd50b8eb77b0dbe5d41531616
// Length-prefixed locking-set SHA256:
//   98f3a2cebb0916acd25536d398e227f165aad9ac199938b591217fb08f84e208
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
