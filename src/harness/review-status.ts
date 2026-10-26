// Evidence-based review status per registered implementation (the soundness reset of
// 2026-10, after the author withdrawals in groth16_cashscript#32 / zk-verifier-bench#49).
//   'reviewed'   - an independent soundness review of the exact shipped artifact found no gaps.
//   'unreviewed' - the author's / maintainer's claim only, with no open finding (the default).
//   'withdrawn'  - the author withdrew the claim, or a finding applies to the shipped artifact;
//                  a finding that is open but not yet confirmed is also held here. A withdrawn
//                  entry stays in results.json entries[] and the score history, but never
//                  counts for the frontier leader / current or new history points.
// Kept as one table keyed by id (not on each implementation module) so registry removals
// stay independent edits; benchmark.ts attaches it to every REGISTRY entry.
import type { Implementation, ReviewStatus } from './types.js';

const SRC = 'https://github.com/mr-zwets/groth16_cashscript';
const BENCH = 'https://github.com/mr-zwets/zk-verifier-bench';
const FINDINGS = [`${SRC}/issues/32`, `${BENCH}/issues/49`];

const withdrawn = (reason: string, refs: string[]): ReviewStatus => ({ status: 'withdrawn', reason, refs });

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

  // BLS12-381 singletons: the maintainer hold (no range/curve/subgroup checks) is resolved by the
  // domain checks added to groth16.cash; rebuilt with the same pipelines.
  'bch-groth16-bls12381-singleton': {
    status: 'unreviewed',
    reason: 'Domain checks added (range, curve, G2 subgroup) to groth16.cash and rebuilt; previously held by maintainer review.',
    refs: [`${SRC}/blob/main/singleton/bls12-381/README.md`],
  },
  'bch-groth16-bls12381-singleton-opcode-optimized': {
    status: 'unreviewed',
    reason: 'Domain checks added (range, curve, G2 subgroup) to groth16.cash and rebuilt; previously held by maintainer review.',
    refs: [`${SRC}/blob/main/singleton/bls12-381/README.md`],
  },

  // withdrawn: author withdrawals (F1/F4/F5/F6/F9)
  'bch-groth16-singleton-genpow': {
    status: 'unreviewed',
    reason: 'Corrected successor (4,320 B program, outline_32 P + O = P and neutral-point handling) merged via groth16_cashscript #30 / bench #47; the original 4,183 B program was withdrawn under F4.',
    refs: [...FINDINGS, `${SRC}/pull/30`, `${BENCH}/pull/47`],
  },
  'bch-groth16-bls12381-singleton-genpow': withdrawn(
    'F5: ships the unchecked 3,295 B leader-recovered program (decompressG1/G2); corrected successor pending.',
    [...FINDINGS, `${SRC}/pull/31`, `${BENCH}/pull/48`],
  ),
  'bch-groth16-intratx': withdrawn(
    'F1 (BN42): the final vk_x chunk reads in1 without an exact-length gate.',
    FINDINGS,
  ),
  'bch-groth16-intratx-authenticated-p2s': withdrawn(
    'F1 (authenticated42): no byte-owner gates on state/table bytes.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-groth16-grouped': withdrawn(
    'F1 (grouped42): in0/in1 are trailing limbs without an exact-length gate.',
    FINDINGS,
  ),
  'bch-groth16-grouped-residue': withdrawn(
    'F1 (grouped26): no carrier / terminal-state byte owner.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-groth16-bls12381-intratx-residue': withdrawn(
    'F1 (BLS24): no GLV-carrier / terminal-state byte owner.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-groth16-intratx-pairfold5': withdrawn(
    'F9: genesis byte-identical to the withdrawn pevalfuse genesis; the public MSM is not established.',
    FINDINGS,
  ),
  'bch-groth16-intratx-pairfold5-pevalfuse': withdrawn(
    'F9: the auxiliary relation does not establish the public MSM.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-groth16-intratx-pairfold5-densless': withdrawn(
    'F6: same millerEvent and terminal bytes as the withdrawn densless constructions; no soundness argument.',
    [...FINDINGS, `${SRC}/issues/28`],
  ),
  'bch-groth16-intratx-pairfold5-densless-msm': withdrawn(
    'F6: densless executors and terminal; no soundness argument.',
    [...FINDINGS, `${SRC}/issues/28`, `${BENCH}/pull/50`],
  ),
  'bch-groth16-intratx-pairfold5-densless-msm-slim': withdrawn(
    'F6: ships the withdrawn densless-msm-slim head; no soundness argument.',
    [...FINDINGS, `${SRC}/issues/28`, `${BENCH}/pull/50`],
  ),
  'bch-groth16-intratx-pairfold5-densless-msm-spec': withdrawn(
    'F6: same densless executors and terminal; no soundness argument.',
    [...FINDINGS, `${SRC}/issues/28`, `${BENCH}/pull/50`],
  ),

  // withdrawn: maintainer holds (open findings, held until resolved)
  'bch-groth16-intratx-pairfold7': withdrawn(
    'Held (F9 class): public-statement binding not established; the harness red-team already fails it.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-vkx-bls12381-chunked-covenant': withdrawn(
    'Held (F3 class): each covenant step pins only commitment + category, not its successor locking.',
    [`${BENCH}/pull/50`],
  ),
  'bch-groth16-bls12381-intratx-residue-large': withdrawn(
    'Held (F1 pattern): chunks are generated without enforceExactInputLength (prefix-only forward checks).',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
  'bch-pairing-intratx': withdrawn(
    'Held partial connected Miller component: raw carrier byte ownership is not proved; no standalone full-verifier claim is asserted.',
    [...FINDINGS, `${BENCH}/pull/50`],
  ),
};

export const reviewStatusOf = (impl: Pick<Implementation, 'id' | 'reviewStatus'>): ReviewStatus =>
  impl.reviewStatus ?? REVIEW_STATUS[impl.id] ?? DEFAULT_REVIEW_STATUS;
