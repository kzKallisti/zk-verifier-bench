// Evidence-based review status per registered implementation (the soundness reset of
// 2026-10, after the author withdrawals in groth16_cashscript#32 / zk-verifier-bench#49).
//   'reviewed'   - an independent soundness review of the exact shipped artifact found no gaps.
//   'unreviewed' - the author's / maintainer's claim only, with no open finding (the default).
//   'withdrawn'  - the author withdrew the claim, or a finding applies to the shipped artifact;
//                  a finding that is open but not yet confirmed is also held here. Never counts
//                  for the frontier leader / current or new history points.
//   'baseline'   - a third-party reference verifier (nChain, sCrypt), measured for comparison.
//   'demo'       - a harness self-test, not a verifier.
//   'component'  - a partial pairing / vk_x checkpoint (category 'partial'), not a full verifier.
//   'archived'   - a superseded legacy entry kept as history only; like 'withdrawn' it is never
//                  ranked (frontier leader / current, new history points), but its row stays.
// Withdrawn implementations are normally removed from REGISTRY (bench #50 removed the 15 rows of
// the reset); their rows then leave results.json entries[] too. The site keeps a frozen copy of
// those last rows (zk-verifier-competition src/data/withdrawn-archive.json). Only ids still in
// REGISTRY belong in this table.
// Kept as one table keyed by id (not on each implementation module) so registry removals
// stay independent edits; benchmark.ts attaches it to every REGISTRY entry.
import type { Implementation, ReviewStatus } from './types.js';

const SRC = 'https://github.com/mr-zwets/groth16_cashscript';
const BENCH = 'https://github.com/mr-zwets/zk-verifier-bench';
const FINDINGS = [`${SRC}/issues/32`, `${BENCH}/issues/49`];

const baseline: ReviewStatus = { status: 'baseline', reason: 'Third-party reference verifier, measured for comparison; not a verifier.cash entry.' };
const component: ReviewStatus = { status: 'component', reason: 'Partial pairing / vk_x component (checkpoint), not a full Groth16 verifier.' };
const archived: ReviewStatus = {
  status: 'archived',
  reason: 'Legacy large chain, superseded by the reviewed sound native and SI-GLS builds; kept as history, not ranked.',
};

/** statuses that never count for the frontier leader / current or new score-history points */
export const UNRANKED_STATUSES: ReadonlySet<ReviewStatus['status']> = new Set(['withdrawn', 'archived']);
export const isRanked = (status: ReviewStatus): boolean => !UNRANKED_STATUSES.has(status.status);

export const DEFAULT_REVIEW_STATUS: ReviewStatus = { status: 'unreviewed' };

export const REVIEW_STATUS: Record<string, ReviewStatus> = {
  // reviewed
  'bch-groth16-sound-si-gls-single': {
    status: 'reviewed',
    reason: 'Independent soundness review of the shipped artifact; see the soundness argument, verification and open risks in its README.',
    refs: [
      `${SRC}/blob/main/chunked/bn254/sound-si-gls/README.md#soundness-argument`,
      `${SRC}/blob/main/chunked/bn254/sound-si-gls/README.md#verification`,
      `${SRC}/blob/main/chunked/bn254/sound-si-gls/README.md#open-risks`,
    ],
  },

  // BLS12-381 SI-GLS (bch-spec): built on wip/bls-si-gls-spec; independent review 2026-10-26 (implementation,
  // math, reproduction) found only minor issues, all six fixed before merge (verifier.cash work/bls-si-gls-spec/FIXLOG.md).
  'bch-groth16-bls12381-sound-si-gls-single': {
    status: 'reviewed',
    reason: 'Independent soundness review of the shipped artifact (2026-10-26; implementation, math and reproduction, minor findings fixed before merge); see the soundness argument, verification and open risks in its README.',
    refs: [
      `${SRC}/blob/main/chunked/bls12-381/sound-si-gls/README.md#soundness-argument`,
      `${SRC}/blob/main/chunked/bls12-381/sound-si-gls/README.md#verification`,
      `${SRC}/blob/main/chunked/bls12-381/sound-si-gls/README.md#open-risks`,
    ],
  },

  // BN254 native (SI-MX3, 3-input bch-2026): built on wip/bn-native-sound; independent review 2026-10-26
  // (implementation, math, reproduction) found only minor issues, fixed or documented before merge
  // (verifier.cash work/bn-native-sound/FIXLOG.md).
  'bch-groth16-bn254-sound-native': {
    status: 'reviewed',
    reason: 'Independent soundness review of the shipped artifact (2026-10-26; implementation, math and reproduction, minor findings fixed or documented before merge); see the soundness argument, verification and open risks in its README.',
    refs: [
      `${SRC}/blob/main/chunked/bn254/bn-native-sound/README.md#soundness-argument-constructive-an-owner-for-every-value`,
      `${SRC}/blob/main/chunked/bn254/bn-native-sound/README.md#verification`,
      `${SRC}/blob/main/chunked/bn254/bn-native-sound/README.md#open-risks`,
    ],
  },

  // BLS12-381 sound native (4-input bch-2026 SI-GLS): built on wip/bls-native-sound; independent review 2026-10-26
  // (implementation, math, reproduction) found only minor issues, fixed or documented in two fix rounds before merge
  // (verifier.cash work/bls-native-sound/FIXLOG.md).
  'bch-groth16-bls12381-sound-native': {
    status: 'reviewed',
    reason: 'Independent soundness review of the shipped artifact (2026-10-26; implementation, math and reproduction, minor findings fixed or documented before merge); see the soundness argument, verification and open risks in its README.',
    refs: [
      `${SRC}/blob/main/chunked/bls12-381/bls-native-sound/README.md#soundness-argument`,
      `${SRC}/blob/main/chunked/bls12-381/bls-native-sound/README.md#verification`,
      `${SRC}/blob/main/chunked/bls12-381/bls-native-sound/README.md#open-risks`,
    ],
  },

  // BN254 singletons: independent review 2026-10-26 (notes: verifier.cash work/bn-singleton-review/REVIEW.md)
  // after the jacAddG1 right-identity fix (bench 15bf0fe). Its one LOW finding, missing
  // 0 <= v < p checks on the proof coordinates (encoding malleability only), is fixed in
  // groth16_cashscript 521460c and rebuilt here; the recompiler fix 35fe0f7 keeps those checks
  // in the opcode-optimized build.
  'bch-groth16-singleton': {
    status: 'reviewed',
    reason: 'independent review 2026-10-26: no soundness break; coordinate range checks added (review LOW finding: encoding malleability only).',
    refs: [`${SRC}/commit/521460c014bafe45b33b67dd061615141be8f37a`, `${SRC}/commit/78a42542451f7bf64072a89358e0bf0acc03a774`],
  },
  'bch-groth16-singleton-opcode-optimized': {
    status: 'reviewed',
    reason: 'independent review 2026-10-26: no soundness break; coordinate range checks added (review LOW finding: encoding malleability only).',
    refs: [`${SRC}/commit/521460c014bafe45b33b67dd061615141be8f37a`, `${SRC}/commit/35fe0f702794f5686238f43ed2bd4c8dd3ac32c4`, `${SRC}/commit/78a42542451f7bf64072a89358e0bf0acc03a774`],
  },

  // BLS12-381 singletons: the maintainer hold (no range/curve/subgroup checks) was resolved by the
  // domain checks added to groth16.cash (groth16_cashscript 14d139e, 974a691). Independent review
  // 2026-10-26 (notes: verifier.cash work/bls-singleton-review/REVIEW.md) found no soundness gaps;
  // its minor follow-ups (Bxa/Bxb/Bya/Cx +p rejection runs, README cofactor-malleability note) are
  // done in wip/bls-singleton-followups. Locking bytecode unchanged by the follow-ups.
  'bch-groth16-bls12381-singleton': {
    status: 'reviewed',
    reason: 'independent review 2026-10-26: no soundness break (range, curve and fused psi G2 subgroup checks verified); follow-ups done: non-canonical +p rejection runs for every coordinate, A/C cofactor malleability documented (malleability only).',
    refs: [`${SRC}/commit/974a6910eb6924cfdbb547ea2556f229d9790421`, `${SRC}/commit/47c1ab15bd837d21c016e2e61b948f0e94b5862b`, `${SRC}/blob/main/singleton/bls12-381/README.md#proof-point-validation`],
  },
  'bch-groth16-bls12381-singleton-opcode-optimized': {
    status: 'reviewed',
    reason: 'independent review 2026-10-26: no soundness break (range, curve and fused psi G2 subgroup checks verified); follow-ups done: non-canonical +p rejection runs for every coordinate, A/C cofactor malleability documented (malleability only).',
    refs: [`${SRC}/commit/974a6910eb6924cfdbb547ea2556f229d9790421`, `${SRC}/commit/47c1ab15bd837d21c016e2e61b948f0e94b5862b`, `${SRC}/blob/main/singleton/bls12-381/README.md#proof-point-validation`],
  },

  // unreviewed successors of withdrawn claims (bench #47 / #48)
  'bch-groth16-singleton-genpow': {
    status: 'unreviewed',
    reason: 'Corrected successor (4,320 B program, outline_32 P + O = P and neutral-point handling) merged via groth16_cashscript #30 / bench #47; the original 4,183 B program was withdrawn under F4.',
    refs: [...FINDINGS, `${SRC}/pull/30`, `${BENCH}/pull/47`],
  },
  'bch-groth16-bls12381-singleton-genpow': {
    status: 'unreviewed',
    reason: 'Corrected successor (5,675 B program): canonical points, complete root chart and cofactor-equivalent G1/G2 projections from source #31 / benchmark #48. Native HOLD remains; original-G2 subgroup rejection is not asserted.',
    refs: [...FINDINGS, `${SRC}/pull/31`, `${BENCH}/pull/48`],
  },

  // baselines: third-party reference verifiers (nChain sCrypt, sCrypt bn256), measured for comparison only
  'nchain': baseline,
  'scrypt-bn256': baseline,

  // demo: harness self-test, not a verifier
  'bch-multistep-demo': { status: 'demo', reason: 'Harness self-test (multi-step covenant demo), not a Groth16 verifier.' },

  // components: partial pairing / vk_x checkpoints (category 'partial'), not full verifiers
  'bch-vkx-singleton': component,
  'bch-vkx-bls12381-singleton': component,
  'bch-vkx-chunked-twoloop': component,
  'bch-vkx-chunked-shamir': component,
  'bch-vkx-chunked-covenant': component,
  'bch-pairing-singleton': component,
  'bch-pairing-bls12381-singleton': component,
  'bch-pairing-chunked': component,
  'bch-pairing-bls12381-chunked': component,
  'bch-pairing-bls12381-intratx': component,

  // archived: legacy large chains, superseded by the reviewed sound-native / SI-GLS builds; kept as history, not ranked
  'bch-groth16-chunked': archived,
  'bch-groth16-chunked-covenant': archived,
  'bch-groth16-bls12381-intratx': archived,
  'bch-groth16-bls12381-grouped': archived,
  'bch-groth16-bls12381-chunked': archived,
  'bch-groth16-bls12381-chunked-covenant': archived,
};

export const reviewStatusOf = (impl: Pick<Implementation, 'id' | 'reviewStatus'>): ReviewStatus =>
  impl.reviewStatus ?? REVIEW_STATUS[impl.id] ?? DEFAULT_REVIEW_STATUS;
