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

  // BN254 singletons: the jacAddG1 right-identity gap (F4 mechanism) is fixed in bench 15bf0fe.
  'bch-groth16-singleton': { status: 'unreviewed', reason: 'jacAddG1 right-identity (P + O = P) fixed and rebuilt in bench 15bf0fe.' },
  'bch-groth16-singleton-opcode-optimized': { status: 'unreviewed', reason: 'jacAddG1 right-identity (P + O = P) fixed and rebuilt in bench 15bf0fe.' },

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
  'bch-groth16-bls12381-singleton': withdrawn(
    'Held by maintainer review: no coordinate range, curve-equation or G2 subgroup checks in groth16.cash.',
    [`${SRC}/blob/main/singleton/bls12-381/README.md`],
  ),
  'bch-groth16-bls12381-singleton-opcode-optimized': withdrawn(
    'Held by maintainer review: same source as the BLS12-381 singleton (no range/curve/subgroup checks).',
    [`${SRC}/blob/main/singleton/bls12-381/README.md`],
  ),
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
};

export const reviewStatusOf = (impl: Pick<Implementation, 'id' | 'reviewStatus'>): ReviewStatus =>
  impl.reviewStatus ?? REVIEW_STATUS[impl.id] ?? DEFAULT_REVIEW_STATUS;
