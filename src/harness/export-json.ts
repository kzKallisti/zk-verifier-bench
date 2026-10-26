// Emit the benchmark as the structured results.json the competition website reads.
// The website never runs the harness directly; it renders this artifact. Usage:
//   pnpm benchmark:json [outfile]      (default: results.json in the cwd)
// Incremental: only entries whose inputHash (harness/input-hash.ts) changed are re-run; the other
// rows of the existing outfile are carried forward. FULL=1 re-runs everything, ONLY_IMPLS=a,b
// exactly those ids (see planExport below and the README).
//
// Schema (v1): a flat list of entries the site groups by `category`:
//   - "full"    -> a full Groth16 verifier        (the MAIN leaderboard)
//   - "partial" -> a checkpoint/sub-step (e.g. vk_x; a SECONDARY leaderboard)
//   - "demo"    -> harness self-test (hidden by default)
// Score = total on-chain bytes (lower = cheaper fees). op-cost / steps are
// secondary. BCH compatibility is a multi-dimensional cell, not a yes/no: a huge
// BSV singleton is a correct, listed submission that simply does not fit BCH.
// Each entry carries `reviewStatus` (reviewed | unreviewed | withdrawn, see
// harness/review-status.ts); withdrawn entries stay listed but never count for the frontier.
import { REVIEW_STATUS, reviewStatusOf } from './review-status.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { BenchmarkResult, Implementation } from './types.js';
import { computeResults, isSkipped, REGISTRY } from './benchmark.js';
import { runImplementation } from './benchmark.js';
import { HARNESS_VERSION, dependenciesOf, implementationModules, inputHashOf } from './input-hash.js';
import { STANDARD_UNLOCKING_CAP, SPEC_SCRIPT_SIZE_CAP, realOpCostBudget, specOpCostBudget } from './vm.js';

const SCHEMA_VERSION = 1;
const SIZE_CAP = STANDARD_UNLOCKING_CAP; // 10,000 B per locking/unlocking script

// Accumulating time-series for the score-history chart, ONE file holding two interleaved
// series tagged by `fits`: the best BCH-native (fitting) full verifier, and the smallest
// NON-fitting single-tx "singleton" ideal — their gap over time is the chunking tax.
const HISTORY_FILE = 'score-history.json';
interface HistoryPoint { t: string; score: number; id: string; steps: number; transactions: number; fits: boolean }
const loadHistory = (): HistoryPoint[] => {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    const arr = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) as HistoryPoint[];
    // legacy points predate the `fits` flag (fitting-only series) and the `transactions`
    // field; the file is backfilled, so the ?? fallbacks only guard a stale/partial read.
    return arr.map((p) => ({ ...p, fits: p.fits ?? true, transactions: p.transactions ?? p.steps }));
  } catch {
    return [];
  }
};
// append best-per-curve points, deduped per (curve, fits) so each curve+series forms its
// own independent line against that track's most recent point.
type Best = { score: number; id: string; steps: number; transactions: number; curve: string; fits: boolean };
const recordHistory = (
  bests: Best[],
  curveOfId: (id: string) => string,
  standardOf: (id: string) => boolean,
  t: string,
  soundOf: (id: string) => boolean = () => true,
): HistoryPoint[] => {
  const series = loadHistory();
  let changed = false;
  for (const best of bests) {
    // each track is keyed by (series, curve, standardness): within the fitting series the
    // standard-relayable frontier and the non-standard frontier are recorded independently,
    // so a smaller non-standard verifier never hides the smallest standard one (and vice versa).
    const bestStandard = standardOf(best.id);
    let last: HistoryPoint | undefined;
    for (let i = series.length - 1; i >= 0; i--) {
      // points of entries that are now unsound are not records (the site hides them too), and
      // their reclassification (e.g. now non-standard) must not re-open a series
      if (!soundOf(series[i].id)) continue;
      // nor are points of withdrawn entries (still kept in the file as history)
      if (REVIEW_STATUS[series[i].id]?.status === 'withdrawn') continue;
      if (series[i].fits === best.fits && curveOfId(series[i].id) === best.curve && standardOf(series[i].id) === bestStandard) { last = series[i]; break; }
    }
    if (last === undefined || last.score !== best.score) {
      series.push({ t, score: best.score, id: best.id, steps: best.steps, transactions: best.transactions, fits: best.fits });
      changed = true;
    }
  }
  if (changed) writeFileSync(HISTORY_FILE, JSON.stringify(series, null, 2) + '\n');
  return series;
};

// 'spec' = a full verifier that targets the PROPOSED bch-spec upgrade (100 kB scripts), NOT
// current BCH. It gets its own category so it is not ranked on the current-BCH 'full' leaderboard
// / frontier (a spec entry plays by different consensus limits — an apples-to-oranges comparison).
type Category = 'full' | 'spec' | 'partial' | 'demo';

// Entries the harness still benchmarks (e.g. for the normalized vs-sCrypt op-cost
// comparison) but the website should not list. bch-vkx-scalarmult is a single
// scalarMult sub-step on the old EC codegen — a fraction of vk_x, so it muddies the
// monolith-vs-chunked milestone story.
const SITE_EXCLUDE = new Set(['bch-vkx-scalarmult']);

const categoryOf = (r: BenchmarkResult): Category => {
  if (r.impl.demo === true) return 'demo';
  if (r.impl.vm === 'bch-spec') return 'spec'; // proposed-upgrade verifier, its own leaderboard
  return r.impl.proofSystem === 'Groth16' ? 'full' : 'partial';
};

// The real BCH blockers, computed independently (the benchmark records only the
// FIRST failing reason, but nchain/scrypt trip both walls). script-size: any
// step's locking OR unlocking exceeds the 10,000-byte cap. op-cost: the heaviest
// step needs more than one standard input's budget.
const bchCell = (r: BenchmarkResult) => {
  // A bch-spec entry is graded against the 100 kB spec cap; a current-BCH entry against 10 kB.
  const sizeCap = r.impl.vm === 'bch-spec' ? SPEC_SCRIPT_SIZE_CAP : SIZE_CAP;
  const scriptSize = r.steps.some((s) => s.lockingBytes > sizeCap || s.unlockingBytes > sizeCap);
  const opCost = r.inputsForHeaviestStep > 1;
  const blockers = [...(scriptSize ? ['script-size'] : []), ...(opCost ? ['op-cost'] : [])];
  const overByBytes = r.steps.filter((s) => s.lockingBytes > sizeCap || s.unlockingBytes > sizeCap).length;
  const detail = r.bchCompatible
    ? r.impl.vm === 'bch-spec'
      ? 'every step fits the proposed bch-spec per-tx limits (100 kB scripts) — NOT current BCH'
      : 'every step fits BCH per-tx limits'
    : [
        scriptSize ? `${overByBytes}/${r.stepCount} step(s) over the ${sizeCap.toLocaleString('en-US')} B script cap` : null,
        opCost ? `heaviest step ~${r.inputsForHeaviestStep}× one input's op-cost budget` : null,
      ]
        .filter(Boolean)
        .join('; ');
  // standardness is strictly stronger than consensus compatibility: a consensus-valid
  // verifier can still be non-standard (e.g. an intra-tx bundle is one ~626 KB tx, over
  // the 100 KB standard size, so it must be mined directly rather than relayed).
  const standard = {
    fits: r.fitsBchStandardness,
    detail: r.fitsBchStandardness ? 'relayable under standard mempool policy' : r.bchStandardnessReason ?? 'non-standard',
  };
  return { compatible: r.bchCompatible, blockers, detail, standard };
};

const isBsvSeed = (impl: Implementation): boolean =>
  impl.reference === true || /BSV mainnet/.test(impl.source);
// BSV prior art: a single huge transaction that is correct but does not fit BCH.
// Only the seeded BSV verifiers carry this framing (not BCH-native sub-steps).
const isBsvSingleton = (impl: Implementation, validPassed: boolean, bchCompatible: boolean): boolean =>
  isBsvSeed(impl) && impl.structure === 'single-tx' && validPassed && !bchCompatible;

// Rolled-up soundness for the entry — the single "is this a valid verifier" signal the
// per-dimension cells (bch / generality / inputValidation / packaging) never summarized. Also the
// home of the cross-stage stapling result (folded in here rather than a separate top-level cell,
// since it is purely a correctness concern). Mirrors the harness `pass` gate, reasons kept legible:
//   'fail'       - a hard defect: the valid run is not fully accepted, an invalid run is wrongly
//                  accepted, the worst-case proof is rejected, packaging is insecure, or a
//                  cross-stage staple or a maintainer red-team attack is accepted. `failures` names
//                  each. DISQUALIFIED — excluded from the frontier leaders and score-history.
//   'valid-only' - the valid run passes but the entry shipped no invalid fixtures, so rejection
//                  was never exercised (correct as far as tested, not the same as proven sound).
//   'pass'       - valid run accepted AND every negative fixture rejected.
const correctnessOf = (r: BenchmarkResult) => {
  const csb = r.crossStageBinding;
  const failures = [
    !r.validPassed ? 'valid run not fully accepted' : null,
    r.invalidTotal > 0 && r.invalidRejected < r.invalidTotal
      ? `${r.invalidTotal - r.invalidRejected}/${r.invalidTotal} invalid run(s) wrongly accepted`
      : null,
    r.worstCase?.accepted === false ? 'worst-case proof rejected (completeness)' : null,
    csb.unboundSeams > 0
      ? `cross-stage staple accepted (${csb.unboundSeams}/${csb.seamsTested} seam(s))`
      : null,
    !r.securePackaging ? 'insecure P2SH20 packaging' : null,
    r.publicInputs.accepted > 0
      ? `mutated public inputs accepted (${r.publicInputs.accepted}/${r.publicInputs.tested}; first: ${r.publicInputs.firstAccepted})`
      : null,
    r.redTeam.accepted > 0
      ? `maintainer red-team attack accepted (${r.redTeam.accepted}/${r.redTeam.tested}; first: "${r.redTeam.firstAccepted}")`
      : null,
  ].filter((x): x is string => x !== null);
  const verdict: 'pass' | 'fail' | 'valid-only' =
    failures.length > 0 ? 'fail' : r.invalidTotal > 0 ? 'pass' : 'valid-only';
  return {
    verdict,
    validAccepted: r.validPassed,
    invalid: { tested: r.invalidTotal, rejected: r.invalidRejected },
    worstCaseAccepted: r.worstCase?.accepted ?? null,
    // Cross-stage stapling (multi-stage soundness): can one proof's stage be spliced onto another
    // proof's remaining stages inside one transaction? A verifier that binds every stage to one
    // proof rejects every such hybrid; an accepted hybrid is a soundness hole (a stage output that
    // nothing later ties to the proof the rest of the run consumes). Tested by building hybrid runs
    // from two distinct valid proofs at each seam (benchmark.ts crossStageStaple). bound=false is a
    // `fail`; bound=null = N/A (single-tx, or a covenant/grouped token hand-off the harness cannot
    // staple-test yet — neither credited nor penalized).
    crossStageBinding: {
      applicable: csb.applicable,
      bound: csb.applicable ? csb.unboundSeams === 0 : null,
      seamsTested: csb.seamsTested,
      unboundSeams: csb.unboundSeams,
      ...(csb.firstUnboundSeam ? { firstUnboundSeam: csb.firstUnboundSeam } : {}),
      detail: !csb.applicable
        ? 'not staple-tested — single-tx, or a covenant/grouped token hand-off the harness does not model yet'
        : csb.unboundSeams === 0
          ? `every stage bound to one proof: ${csb.seamsTested} seams staple-tested with a 2nd distinct proof, all rejected`
          : `UNBOUND: ${csb.unboundSeams}/${csb.seamsTested} seam(s) accept a spliced 2-proof hybrid (first at "${csb.firstUnboundSeam}") — one proof's stage can be stapled onto another proof's remaining stages`,
    },
    // Maintainer red-team gate (harness/redteam.ts): attacks on the entry's exact bytes that a
    // sound verifier must reject, e.g. a real proof with FORGED public inputs. null = no file.
    redTeam: r.redTeam.present
      ? { stale: r.redTeam.stale, tested: r.redTeam.tested, accepted: r.redTeam.accepted, kinds: r.redTeam.kinds, ...(r.redTeam.firstAccepted ? { firstAccepted: r.redTeam.firstAccepted } : {}) }
      : null,
    // Public-input binding gate (harness/gates.ts); null = the entry did not declare its inputs.
    publicInputs: r.publicInputs.declared ? { tested: r.publicInputs.tested, accepted: r.publicInputs.accepted, ...(r.publicInputs.firstAccepted ? { firstAccepted: r.publicInputs.firstAccepted } : {}) } : null,
    // Layout review (not a verdict): free-length pads whose lengthening breaks a sibling input.
    layoutReview: r.layout.applicable ? { padsTested: r.layout.padsTested, freeLength: r.layout.malleable, dependencies: r.layout.dependencies } : null,
    failures,
  };
};

const entryOf = (r: BenchmarkResult) => ({
  id: r.impl.id,
  name: r.impl.name,
  category: categoryOf(r),
  official: isBsvSeed(r.impl), // seeded baseline, not a community submission
  solver: isBsvSeed(r.impl) ? { handle: r.impl.id, model: null, official: true } : null,
  curve: r.impl.field,
  structure: r.impl.structure,
  proofSystem: r.impl.proofSystem,
  // Which BCH VM the entry targets: 'bch-2026' (current chain) or 'bch-spec' (proposed 100 kB-
  // script upgrade). Lets the site badge/segregate spec entries (also carried by `category: spec`).
  vmTarget: r.impl.vm ?? 'bch-2026',
  // Rolled-up soundness: verdict (pass | fail | valid-only), the underlying valid/invalid-run and
  // worst-case data, the folded-in cross-stage stapling result, and a `failures` summary. The
  // single headline "is this a valid verifier" signal the per-dimension cells never summarized;
  // `verdict: 'fail'` disqualifies the entry from the frontier leaders / score-history (see main()).
  correctness: correctnessOf(r),
  // Evidence-based soundness review status: 'reviewed' (independent review of this exact
  // artifact), 'unreviewed' (author/maintainer claim, no open finding; the default) or
  // 'withdrawn' (claim withdrawn or a finding applies). Withdrawn entries stay listed here
  // and in the history, but are excluded from the frontier leader / current (see main()).
  reviewStatus: reviewStatusOf(r.impl),
  // headline score = full on-chain footprint (lower is better): the verifier scripts PLUS
  // the serialized transaction overhead (envelope + outpoints + CashToken prefixes + varints).
  // Folding tx overhead in makes structures comparable — a covenant chain pays it once PER
  // STEP (its real recurring cost), a single-tx verifier pays it once. `size` breaks it down.
  score: r.totalBytes + r.totalTxOverheadBytes,
  size: {
    scriptBytes: r.totalBytes,
    txOverheadBytes: r.totalTxOverheadBytes,
    transactions: r.txCount,
    total: r.totalBytes + r.totalTxOverheadBytes,
  },
  // dead-weight zero-padding: all-zero push bytes added to unlockings purely to buy op-cost
  // budget (wherever they sit — last in bare scripts, second-to-last under P2SH), and their
  // share of the SCRIPT bytes. A big slice of the chunking overhead; 0 for unpadded singletons
  // (proof in the witness, no covenant padding).
  padding: { bytes: r.totalPadBytes, fraction: r.totalBytes > 0 ? r.totalPadBytes / r.totalBytes : 0 },
  // op-cost benchmarks, keyed by the PROOF SCENARIO actually RUN. Even though the
  // chunked covenant lockings are now worst-case SIZED (the fixed step graph can
  // verify ANY public input < r), the measured op-cost still depends on the specific
  // proof executed: a sparse/small input skips most doublings+adds, a dense full-width
  // input pays for all of them. So one number is misleading — we key by the proof run.
  // 'smallProof' is the committed small public inputs the vectors ship with; a
  // 'worstCase' run (dense, near-r inputs through the SAME lockings) is added per entry
  // as those vectors land. NOTE: any GLV/Shamir vk_x verifier is proof-DEPENDENT (the MSM
  // does an add nearly every iteration for dense scalars), so its worstCase jumps ~15M over
  // smallProof — this holds for the GLV singletons too, not just the chunked entries. Every
  // runtime-general entry should therefore ship a worstCaseProof so the column is apples-to-
  // apples; measuring one entry on committed and another on worst-case is the mismatch that
  // makes a singleton look cheaper than an equivalent chunked build when it is not.
  benchmarks: {
    smallProof: {
      opCost: r.totalOperationCost,
      steps: r.stepCount,
      heaviestStepOpCost: r.maxStepOperationCost,
      inputsForHeaviestStep: r.inputsForHeaviestStep,
    },
    ...(r.worstCase
      ? {
          worstCase: {
            accepted: r.worstCase.accepted,
            opCost: r.worstCase.totalOperationCost,
            steps: r.worstCase.stepCount,
            heaviestStepOpCost: r.worstCase.maxStepOperationCost,
            inputsForHeaviestStep: r.worstCase.inputsForHeaviestStep,
          },
        }
      : {}),
  },
  // Total op-cost budget these deployed contracts actually hold: the sum over inputs of
  // (densityControlBase + this input's unlocking bytecode length) * 800 — base 41 on the
  // current BCH_2026 VM, 10,000 on bch-spec. Uses each input's REAL unlocking length (redeem
  // script + unlocking script, incl. any op-cost padding; not the script-size cap), so it is
  // the true ceiling the total op-cost is measured against. Proof-independent, so it sits
  // outside `benchmarks`.
  opCostBudget: r.steps.reduce(
    (a, s) => a + (r.impl.vm === 'bch-spec' ? specOpCostBudget : realOpCostBudget)(s.unlockingBytes),
    0,
  ),
  // BSV prior art: a single huge transaction that is correct but does not fit BCH.
  bsvSingleton: isBsvSingleton(r.impl, r.validPassed, r.bchCompatible),
  // correctness was judged under BSV's post-Genesis OP_RETURN-terminator rule, which
  // BCH treats as failure (so the success case is scored differently per chain)
  bsvOpReturn: r.bsvOpReturn,
  bch: bchCell(r),
  // proof-generality: does ONE deployed program verify many proofs (runtime-general)
  // or just the one it was built for (instance-specific)? Empirically confirmed where
  // extra proofs were run (proofsTested > 1).
  generality: {
    binding: r.proofBinding, // 'runtime' | 'baked'
    runtimeGeneral: r.runtimeGeneral,
    proofsTested: r.proofsTested,
    proofsPassed: r.proofsPassed,
    detail:
      r.proofBinding === 'baked'
        ? 'instance-specific: the proof is baked into the program; a different proof needs it regenerated'
        : r.proofsTested >= 2
          ? `runtime-general: one fixed locking verifies ${r.proofsPassed}/${r.proofsTested} distinct proofs (proof in the unlocking witness)`
          : 'runtime-general by construction: proof supplied in the unlocking witness (1 reference proof available)',
  },
  // token-threading covenant safety (only meaningful for covenant entries): does the
  // covenant pin the carried token (category continuity + capability) so the threaded
  // state cannot be swapped/forged? null when the entry does not thread a token.
  tokenSafety: r.tokenThreaded
    ? {
        threaded: true,
        enforced: r.tokenSafetyEnforced === true,
        detail:
          r.tokenSafetyEnforced === true
            ? 'covenant pins category + capability and perpetuates the commitment'
            : 'state threaded through the NFT commitment, but category continuity / capability are NOT enforced — a real deployment must pin a fixed category with a perpetuated mutable commitment (or mint a fresh immutable token each step)',
      }
    : null,
  // EIP-197 input validation: does the verifier reject structurally-invalid points
  // (off-curve, or G2 off the order-r subgroup) before pairing them? Empirically
  // confirmed by running adversarial-point inputs (Scenario.invalidInputs).
  inputValidation: {
    enforced: r.inputValidation.enforced,
    tested: r.inputValidation.tested,
    rejected: r.inputValidation.rejected,
    detail:
      r.inputValidation.tested === 0
        ? 'NOT demonstrated — no isolated adversarial-point run that rejects a bad point at a validation check (a naive point-swap in a single-tx verifier is caught by the pairing equation, not by validation)'
        : r.inputValidation.enforced
          ? `on-curve + G2-subgroup checks enforced: ${r.inputValidation.rejected}/${r.inputValidation.tested} adversarial points (off-curve / off-subgroup) rejected at an isolated check`
          : `NOT enforced: only ${r.inputValidation.rejected}/${r.inputValidation.tested} adversarial points rejected — raw points reach the pairing`,
  },
  // envelope security: `type` is what the steps' lockings actually are (p2sh32 | p2s |
  // p2sh20 | mixed). A contract hidden behind an insecure P2SH20 hash (OP_HASH160,
  // ~2^80 collision security) is DISALLOWED — it must use P2SH32, or deploy bare (P2S).
  // `secure: false` disqualifies the entry (it is excluded from the frontier leaders and
  // the score-history below). Orthogonal to BCH compatibility: P2SH20 is itself valid +
  // relayable, this is the competition's cryptographic-security rule.
  packaging: {
    secure: r.securePackaging,
    type: r.packagingType,
    ...(r.securePackaging ? {} : { detail: `DISALLOWED: ${r.insecurePackagingReason}` }),
  },
  source: r.impl.source,
});

// `inputHash` (harness/input-hash.ts) is appended to every row: the hash of the inputs that
// produced its measurements. The incremental export re-runs a row only when it changes.
type Entry = ReturnType<typeof entryOf> & { inputHash?: string };

const anchor = (e: Entry | undefined, label: string) =>
  e === undefined
    ? null
    : { id: e.id, label, curve: e.curve, bytes: e.score, bchCompatible: e.bch.compatible };

// Presentation metadata is never measured, so a row carried forward from the previous artifact
// gets the CURRENT registry metadata re-attached (in place, so the key order is unchanged):
// name, source text, the fields derived from them, and the review status (re-stamped in main()).
const attachMetadata = (e: Entry, impl: Implementation): void => {
  e.name = impl.name;
  e.official = isBsvSeed(impl);
  e.solver = isBsvSeed(impl) ? { handle: impl.id, model: null, official: true } : null;
  e.bsvSingleton = isBsvSingleton(impl, e.correctness.validAccepted, e.bch.compatible);
  e.source = impl.source;
};

const envList = (name: string): string[] | undefined => {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
};

// Incremental export. Each registered entry is either RE-RUN (fresh measurement) or CARRIED
// forward from the previous artifact unchanged except for its metadata:
//   default        re-run entries that are new, lack an inputHash, or whose inputHash changed
//   FULL=1         re-run every entry (except SKIP_IMPLS ones, see below)
//   ONLY_IMPLS=a,b re-run exactly these ids (exact match, bypasses SKIP_IMPLS); carry every
//                  other row as is, even a stale one (its old inputHash keeps it marked stale)
//   SKIP_IMPLS     (default 'genpow') never re-run unless forced; carried only while their
//                  inputs are unchanged (or, for a legacy row without inputHash, while the
//                  registered name/source still match), otherwise dropped with a warning
//   STAMP_HASHES=1 bootstrap: give previous rows that have no inputHash the current hash
//                  without re-running (only when the artifact is known to match the sources)
// An entry whose data/ file is missing (e.g. the nChain / sCrypt mainnet tx hex, fetched by
// `pnpm fetch`) is carried forward with a warning; with no previous row to carry it fails loudly.
// A failing load is an error, never a silently dropped row.
type Plan = { impl: Implementation; action: 'run' | 'carry' | 'drop' | 'absent'; reason: string; hash: string; previous?: Entry };

const planExport = async (previous: Map<string, Entry>): Promise<Plan[]> => {
  const full = process.env.FULL === '1';
  const stamp = process.env.STAMP_HASHES === '1';
  const only = envList('ONLY_IMPLS');
  const registered = new Set(REGISTRY.map((impl) => impl.id));
  const unknown = (only ?? []).filter((id) => !registered.has(id));
  if (unknown.length > 0) throw new Error(`ONLY_IMPLS names unregistered id(s): ${unknown.join(', ')}`);
  const modules = await implementationModules(REGISTRY);
  // include demos so the artifact is complete; the site filters by category.
  return REGISTRY.filter((impl) => !SITE_EXCLUDE.has(impl.id)).map((impl): Plan => {
    const deps = dependenciesOf(impl.id, modules.get(impl.id)!);
    const hash = inputHashOf(impl.id, deps);
    const prev = previous.get(impl.id);
    const missingData = deps.filter((d) => d.missing && d.path.startsWith('data/')).map((d) => d.path);
    const forced = only?.includes(impl.id) === true;
    const plan = (action: Plan['action'], reason: string): Plan => ({ impl, action, reason, hash, previous: prev });
    if (missingData.length > 0) {
      if (forced || prev === undefined) {
        throw new Error(`${impl.id}: missing data file(s) ${missingData.join(', ')} and ${forced ? 'ONLY_IMPLS forces a re-run' : 'no previous row to carry forward'}; run \`pnpm fetch\``);
      }
      return plan('carry', `data missing (${missingData.join(', ')}); carried forward, run \`pnpm fetch\` to re-measure`);
    }
    if (only !== undefined) return forced ? plan('run', 'ONLY_IMPLS') : prev === undefined ? plan('absent', 'not in ONLY_IMPLS, no previous row') : plan('carry', prev.inputHash === hash ? 'unchanged' : 'not in ONLY_IMPLS (STALE: inputs changed)');
    if (stamp && prev !== undefined && prev.inputHash === undefined) {
      prev.inputHash = hash;
      return plan('carry', 'STAMP_HASHES: adopted current input hash');
    }
    if (isSkipped(impl.id)) {
      if (prev === undefined) return plan('absent', 'SKIP_IMPLS, no previous row');
      const current = prev.inputHash === undefined
        // legacy row: the PR #50 metadata-identity guard (same registered name and source)
        ? prev.name === impl.name && prev.source === impl.source
        : prev.inputHash === hash;
      return current ? plan('carry', 'SKIP_IMPLS, inputs unchanged') : plan('drop', 'SKIP_IMPLS but its inputs changed: the old row does not measure the current program; re-run it with ONLY_IMPLS');
    }
    if (full) return plan('run', 'FULL=1');
    if (prev === undefined) return plan('run', 'new entry');
    if (prev.inputHash === undefined) return plan('run', 'no input hash in previous row');
    if (prev.inputHash !== hash) return plan('run', 'inputs changed');
    return plan('carry', 'unchanged');
  });
};

const main = async () => {
  const outfile = process.argv[2] ?? 'results.json';
  const registered = new Map(REGISTRY.map((implementation) => [implementation.id, implementation]));

  const previous = new Map<string, Entry>();
  if (existsSync(outfile)) {
    try {
      const artifact = JSON.parse(readFileSync(outfile, 'utf8')) as { entries?: Entry[] };
      for (const entry of artifact.entries ?? []) previous.set(entry.id, entry);
    } catch { /* unreadable previous artifact: everything is re-run */ }
  }

  const plans = await planExport(previous);
  const runs = plans.filter((p) => p.action === 'run');
  console.error(`incremental export (harness v${HARNESS_VERSION}): ${runs.length} to run, ${plans.filter((p) => p.action === 'carry').length} carried forward`);
  for (const p of plans) if (p.action !== 'carry' || p.reason !== 'unchanged') console.error(`  ${p.action.padEnd(6)} ${p.impl.id}: ${p.reason}`);
  // rows of ids that are no longer registered leave the feed (e.g. a withdrawal, PR #50)
  const unregistered = [...previous.keys()].filter((id) => !registered.has(id) || SITE_EXCLUDE.has(id));
  if (unregistered.length > 0) console.error(`  removed (no longer registered/listed): ${unregistered.join(', ')}`);

  const fresh = new Map<string, Entry>();
  const failures: string[] = [];
  for (const p of runs) {
    const t = Date.now();
    try {
      fresh.set(p.impl.id, { ...entryOf(await runImplementation(p.impl)), inputHash: p.hash });
      console.error(`  ran    ${p.impl.id} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
    } catch (error) {
      failures.push(`${p.impl.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    // never drop a row silently: refuse to write a partial artifact
    console.error(`export FAILED, ${outfile} left unchanged:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }

  // merged rows, always in registry order
  const entries: Entry[] = [];
  for (const p of plans) {
    if (p.action === 'run') entries.push(fresh.get(p.impl.id)!);
    else if (p.action === 'carry') {
      attachMetadata(p.previous!, p.impl);
      entries.push(p.previous!);
    }
  }

  // re-stamp the review status (entries carried forward from an older artifact may predate it)
  for (const e of entries) e.reviewStatus = reviewStatusOf({ id: e.id, reviewStatus: undefined });

  const byId = (id: string) => entries.find((e) => e.id === id);
  const full = entries.filter((e) => e.category === 'full');
  // withdrawn entries never count for the frontier (leader / current) or new history points
  const active = full.filter((e) => e.reviewStatus.status !== 'withdrawn');
  // current best GENUINE BCH-native verifier (none yet -> null): fits the per-tx limits
  // AND verifies any proof at runtime. Instance-specific (baked) artifacts fit but are
  // excluded, so neither the frontier "current" nor the score-history records them.
  const bestBchNative = active
    .filter((e) => e.bch.compatible && e.generality.runtimeGeneral && e.packaging.secure && e.correctness?.verdict !== 'fail')
    .sort((a, b) => a.score - b.score)[0];
  // smallest BCH-native (non-baseline) full verifier: the current frontier leader,
  // whether or not it already fits BCH per-tx limits. A P2SH20-packaged entry is
  // disqualified, so it can never be the leader.
  const leader = active
    .filter((e) => !e.official && e.packaging.secure && e.correctness?.verdict !== 'fail')
    .sort((a, b) => a.score - b.score)[0];

  // accumulate the score-history time-series, per curve so each curve draws its own line.
  // The FITTING (BCH-native) series is tracked as two frontiers — smallest standard-relayable
  // and smallest non-standard-but-compatible — plus the smallest NON-fitting singleton (the
  // single-tx ideal that busts the limits); the singleton-vs-fitting gap is the chunking tax.
  const generatedAt = new Date().toISOString();
  const curveOfId = (id: string): string => entries.find((e) => e.id === id)?.curve ?? 'BN254';
  const standardOf = (id: string): boolean => entries.find((e) => e.id === id)?.bch.standard.fits ?? false;
  const curvesPresent = [...new Set(full.map((e) => e.curve))];
  const smallestPerCurve = (pred: (e: Entry) => boolean, fits: boolean): Best[] =>
    curvesPresent
      .map((c) => active.filter((e) => e.curve === c && pred(e)).sort((a, b) => a.score - b.score)[0])
      .filter((e): e is Entry => e !== undefined)
      .map((e) => ({ score: e.score, id: e.id, steps: e.benchmarks.smallProof.steps, transactions: e.size.transactions, curve: e.curve, fits }));

  const history = recordHistory(
    [
      // fitting series, split by standardness so each frontier is recorded independently
      ...smallestPerCurve((e) => e.bch.compatible && e.bch.standard.fits && e.generality.runtimeGeneral && e.packaging.secure && e.correctness?.verdict !== 'fail', true),
      ...smallestPerCurve((e) => e.bch.compatible && !e.bch.standard.fits && e.generality.runtimeGeneral && e.packaging.secure && e.correctness?.verdict !== 'fail', true),
      // singleton ideal: smallest verifier that busts the BCH limits entirely
      ...smallestPerCurve((e) => !e.official && !e.bch.compatible && e.packaging.secure && e.correctness?.verdict !== 'fail', false),
    ],
    curveOfId,
    standardOf,
    generatedAt,
    (id) => registered.has(id) && entries.some((e) => e.id === id && e.correctness?.verdict !== 'fail'),
  );

  const artifact = {
    schema: SCHEMA_VERSION,
    generatedAt,
    statement: {
      proofSystem: 'Groth16',
      // the competition's pinned BN254 target (same curve as the BCH-native work)
      curve: 'BN254',
      note: 'Cross-curve totals are indicative, not apples-to-apples; filter by curve to compare.',
    },
    frontier: {
      // BSV prior art: works as one huge singleton tx, fails BCH limits
      scrypt: anchor(byId('scrypt-bn256'), 'BSV sCrypt · BN254 · huge singleton · ✗ BCH'),
      nchain: anchor(byId('nchain'), 'BSV nChain · BLS12-381 · huge singleton · ✗ BCH'),
      // the wall every BCH submission must get under (per transaction)
      bchPerTxCap: { label: 'BCH per-tx script cap', bytes: SIZE_CAP },
      // smallest BCH-native full verifier so far (the frontier leader)
      leader: leader === undefined ? null : anchor(leader, 'BCH-native full verifier'),
      // best full verifier that fits BCH, or null while the slot is open
      current: bestBchNative === undefined ? null : anchor(bestBchNative, 'Best BCH-native full verifier'),
    },
    history,
    entries,
  };

  writeFileSync(outfile, JSON.stringify(artifact, null, 2) + '\n');
  const counts = entries.reduce<Record<string, number>>((a, e) => ((a[e.category] = (a[e.category] ?? 0) + 1), a), {});
  console.log(`wrote ${outfile}: ${entries.length} entries (${JSON.stringify(counts)})`);
};

await main();
