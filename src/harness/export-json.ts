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
//   - "spec"    -> a full verifier for the proposed bch-spec VM (its own leaderboard)
// Score = total on-chain bytes (lower = cheaper fees). op-cost / steps are
// secondary. BCH compatibility is a multi-dimensional cell, not a yes/no: a huge
// BSV singleton is a correct, listed submission that simply does not fit BCH.
// Each entry carries `reviewStatus` (reviewed | unreviewed | withdrawn, see
// harness/review-status.ts); withdrawn entries stay listed but never count for the frontier.
//
// The row itself is built by entryOf in harness/entry.ts (part of the harness fingerprint in every
// inputHash). This file only plans the export and recomputes the frontier and score history from
// the merged rows, so editing it never makes a stored row stale.
import { REVIEW_STATUS, reviewStatusOf } from './review-status.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Implementation } from './types.js';
import { HARNESS_VERSION, assertUnmodifiedSince, dependenciesOf, implementationModules, inputHashOf } from './input-hash.js';
import { isSkipped, REGISTRY, runImplementation } from './benchmark.js';
import { SIZE_CAP, entryOf, isBsvSeed, isBsvSingleton, type Entry } from './entry.js';

const SCHEMA_VERSION = 1;

// Accumulating time-series for the score-history chart, ONE file holding two interleaved
// series tagged by `fits`: the best BCH-native (fitting) full verifier, and the smallest
// NON-fitting single-tx "singleton" ideal — their gap over time is the chunking tax.
// The history file lives next to the outfile: results.json -> score-history.json in the same
// directory; any other outfile (an experiment, e.g. `pnpm benchmark:json scratch.json`) gets its
// own <outfile>.score-history.json, seeded read-only from the default score-history.json in the
// cwd, so an experiment never appends a point to the real history.
const OUTFILE = process.argv[2] ?? 'results.json';
const DEFAULT_HISTORY_FILE = 'score-history.json';
const HISTORY_FILE = basename(OUTFILE) === 'results.json'
  ? join(dirname(OUTFILE), DEFAULT_HISTORY_FILE)
  : `${OUTFILE.replace(/\.json$/, '')}.score-history.json`;
interface HistoryPoint { t: string; score: number; id: string; steps: number; transactions: number; fits: boolean }
const loadHistory = (): HistoryPoint[] => {
  const source = existsSync(HISTORY_FILE) ? HISTORY_FILE : DEFAULT_HISTORY_FILE;
  if (!existsSync(source)) return [];
  try {
    const arr = JSON.parse(readFileSync(source, 'utf8')) as HistoryPoint[];
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
): { series: HistoryPoint[]; changed: boolean } => {
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
  return { series, changed };
};

// Registered entries that are deliberately NOT emitted in the feed (no row, no history point, not
// counted as missing, never run by the export; ONLY_IMPLS refuses them). Each export logs them.
// This is a standing policy list, unlike ALLOW_DROP (a one-off, degraded, non-zero exit).
//   site-exclude: still benchmarked by `pnpm benchmark`, but the website should not list it.
//     bch-vkx-scalarmult is a single scalarMult sub-step on the old EC codegen, a fraction of
//     vk_x, so it muddies the monolith-vs-chunked milestone story.
//   hold: registered descriptor whose observation is withheld pending qualification. Removing
//     the id here makes the next default export measure and publish it.
const FEED_OMIT = new Map<string, string>([
  ['bch-vkx-scalarmult', 'site-exclude: sub-step benchmark, not listed on the site'],
]);

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
//                  (SKIP_IMPLS ones included: a slow entry is measured when its inputs change)
//   FULL=1         re-run every entry, except SKIP_IMPLS ones whose inputHash still matches
//   ONLY_IMPLS=a,b re-run exactly these ids (exact match, bypasses SKIP_IMPLS; an id in
//                  FEED_OMIT or unregistered is an error; not combinable with FULL=1); carry
//                  every other row as is. A carried row whose inputs changed is STALE
//   SKIP_IMPLS     (default 'genpow') the slow entries: FULL=1 does not force them, but they are
//                  re-run like any other entry when they are new, lack an inputHash (a legacy
//                  row, inputs unknown) or their inputs changed. Never dropped
//   DEFER_SKIPPED=1  do not wait for those SKIP_IMPLS re-runs: carry the old row instead,
//                  marked STALE (needs a previous row; one with no row at all fails)
//   STALE rows     carry an explicit `stale` field (the reason) and keep their old inputHash, so
//                  the next default run re-runs them; the artifact is written, but history and
//                  frontier are frozen and the export exits 2 (never publish it)
//   ALLOW_DROP=1   write the artifact even though rows are absent (ONLY_IMPLS without a previous
//                  row); history and frontier are then frozen (never recomputed from the reduced
//                  row set) and the export exits 2: a degraded artifact, never a standing policy
//                  (see FEED_OMIT)
// An entry whose data/ file is missing (e.g. the nChain / sCrypt mainnet tx hex, fetched by
// `pnpm fetch`) is hashed through the digest pinned in data/<x>/SHA256SUMS, so its row is
// carried only while every input is unchanged; anything that would re-run it fails loudly
// (FULL=1 too, unless ALLOW_MISSING_DATA=1). A failing load is an error, never a dropped row.
type Action = 'run' | 'carry' | 'stale' | 'absent';
type Plan = { impl: Implementation; action: Action; reason: string; hash: string; previous?: Entry };

const planExport = async (previous: Map<string, Entry>): Promise<Plan[]> => {
  const full = process.env.FULL === '1';
  const allowMissingData = process.env.ALLOW_MISSING_DATA === '1';
  const deferSkipped = process.env.DEFER_SKIPPED === '1';
  const only = envList('ONLY_IMPLS');
  if (process.env.STAMP_HASHES !== undefined) throw new Error('STAMP_HASHES was removed (it adopted hashes without re-running); rows without an inputHash are re-run, or fail under SKIP_IMPLS');
  if (full && only !== undefined) throw new Error('FULL=1 and ONLY_IMPLS are mutually exclusive');
  if (deferSkipped && only !== undefined) throw new Error('DEFER_SKIPPED=1 and ONLY_IMPLS are mutually exclusive (ONLY_IMPLS already carries every other row, as STALE when changed)');
  const registered = new Set(REGISTRY.map((impl) => impl.id));
  const unknown = (only ?? []).filter((id) => !registered.has(id));
  if (unknown.length > 0) throw new Error(`ONLY_IMPLS names unregistered id(s): ${unknown.join(', ')}`);
  const omitted = (only ?? []).filter((id) => FEED_OMIT.has(id));
  if (omitted.length > 0) throw new Error(`ONLY_IMPLS names id(s) the feed omits (FEED_OMIT): ${omitted.map((id) => `${id} (${FEED_OMIT.get(id)})`).join(', ')}`);
  const modules = await implementationModules(REGISTRY);
  return REGISTRY.filter((impl) => !FEED_OMIT.has(impl.id)).map((impl): Plan => {
    const deps = dependenciesOf(impl.id, modules.get(impl.id)!);
    const hash = inputHashOf(impl.id, deps);
    const prev = previous.get(impl.id);
    const forced = only?.includes(impl.id) === true;
    const plan = (action: Action, reason: string): Plan => ({ impl, action, reason, hash, previous: prev });

    const missingData = deps.filter((d) => d.missing && d.path.startsWith('data/'));
    if (missingData.length > 0) {
      const paths = missingData.map((d) => d.path).join(', ');
      const fetchHint = 'run `pnpm fetch` first';
      const unpinned = missingData.filter((d) => !d.pinned).map((d) => d.path);
      if (unpinned.length > 0) throw new Error(`${impl.id}: missing data file(s) ${unpinned.join(', ')} with no pinned digest (data/<x>/SHA256SUMS), so the row cannot be checked against the current inputs; ${fetchHint}`);
      if (forced) throw new Error(`${impl.id}: ONLY_IMPLS forces a re-run but data file(s) ${paths} are missing; ${fetchHint}`);
      if (prev === undefined) throw new Error(`${impl.id}: missing data file(s) ${paths} and no previous row to carry forward; ${fetchHint}`);
      if (prev.inputHash !== hash) {
        if (only !== undefined) return plan('stale', `not in ONLY_IMPLS, data missing (${paths}) and inputs changed (STALE)`);
        throw new Error(`${impl.id}: its inputs changed but data file(s) ${paths} are missing, so it cannot be re-measured; ${fetchHint}`);
      }
      if (full && !allowMissingData) throw new Error(`${impl.id}: FULL=1 but data file(s) ${paths} are missing; ${fetchHint} (or ALLOW_MISSING_DATA=1 to carry the unchanged row)`);
      return plan('carry', `data missing (${paths}) but every input matches the pinned digests; carried forward unchanged`);
    }
    if (only !== undefined) {
      if (forced) return plan('run', 'ONLY_IMPLS');
      if (prev === undefined) return plan('absent', 'not in ONLY_IMPLS, no previous row');
      return prev.inputHash === hash ? plan('carry', 'unchanged') : plan('stale', 'not in ONLY_IMPLS, inputs changed (STALE)');
    }
    // why the previous row does not measure the current inputs (undefined: it does)
    const outdated = prev === undefined ? 'new entry'
      : prev.inputHash === undefined ? 'no input hash in previous row (legacy row, inputs unknown)'
        : prev.inputHash !== hash ? 'inputs changed' : undefined;
    if (isSkipped(impl.id)) {
      // a slow entry: never forced by FULL=1, but never left stale or dropped either
      if (outdated === undefined) return plan('carry', 'SKIP_IMPLS, inputs unchanged');
      if (!deferSkipped) return plan('run', `SKIP_IMPLS (slow) but ${outdated}: measuring it`);
      if (prev === undefined) return plan('absent', `DEFER_SKIPPED but there is no previous row to carry; run without DEFER_SKIPPED`);
      return plan('stale', `DEFER_SKIPPED: ${outdated}, old row carried (STALE)`);
    }
    if (full) return plan('run', 'FULL=1');
    if (outdated !== undefined) return plan('run', outdated);
    return plan('carry', 'unchanged');
  });
};

interface Artifact { generatedAt?: string; frontier?: unknown; entries?: Entry[] }

const main = async () => {
  const outfile = OUTFILE;
  // include demos so the artifact is complete; the site filters by category.
  const registered = new Map(REGISTRY.map((implementation) => [implementation.id, implementation]));

  const previous = new Map<string, Entry>();
  let previousText: string | undefined;
  let previousArtifact: Artifact | undefined;
  if (existsSync(outfile)) {
    previousText = readFileSync(outfile, 'utf8');
    try {
      previousArtifact = JSON.parse(previousText) as Artifact;
      for (const entry of previousArtifact.entries ?? []) previous.set(entry.id, entry);
    } catch (error) {
      // everything is re-run; SKIP_IMPLS entries then become 'absent', which fails below
      console.error(`warning: ${outfile} is unreadable (${error instanceof Error ? error.message : String(error)}); no row can be carried forward`);
    }
  }

  let plans: Plan[];
  try {
    plans = await planExport(previous);
  } catch (error) {
    console.error(`export FAILED, ${outfile} and ${HISTORY_FILE} left unchanged: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  const runs = plans.filter((p) => p.action === 'run');
  const count = (a: Action) => plans.filter((p) => p.action === a).length;
  console.error(`incremental export (harness v${HARNESS_VERSION}): ${runs.length} to run, ${count('carry')} carried forward${count('stale') > 0 ? `, ${count('stale')} STALE` : ''}`);
  for (const p of plans) if (p.action !== 'carry' || p.reason !== 'unchanged') console.error(`  ${p.action.padEnd(6)} ${p.impl.id}: ${p.reason}`);
  for (const [id, why] of FEED_OMIT) if (registered.has(id)) console.error(`  omit   ${id}: ${why}${previous.has(id) ? ' (previous row removed)' : ''}`);
  // rows of ids that are no longer registered leave the feed (e.g. a withdrawal, PR #50)
  const unregistered = [...previous.keys()].filter((id) => !registered.has(id));
  if (unregistered.length > 0) console.error(`  removed (no longer registered): ${unregistered.join(', ')}`);

  // An absent row would leave a hole in the artifact and, worse, shift the frontier and
  // append a false point to the append-only score history. Refuse unless explicitly allowed.
  const missing = plans.filter((p) => p.action === 'absent');
  const allowDrop = process.env.ALLOW_DROP === '1';
  if (missing.length > 0 && !allowDrop) {
    console.error(`export FAILED, ${outfile} and ${HISTORY_FILE} left unchanged: ${missing.length} row(s) would be missing:\n  ${missing.map((p) => `${p.impl.id}: ${p.reason}`).join('\n  ')}\n(ALLOW_DROP=1 writes a degraded artifact without them: history and frontier frozen, exit 2, never publish)`);
    process.exit(1);
  }

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
  // module-level vector loads happened when benchmark.js was imported, before the hashes were
  // computed: refuse to store hashes if any hashed input was edited after this process started
  try {
    assertUnmodifiedSince(performance.timeOrigin);
  } catch (error) {
    console.error(`export FAILED, ${outfile} and ${HISTORY_FILE} left unchanged: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // merged rows, always in registry order
  const entries: Entry[] = [];
  for (const p of plans) {
    if (p.action === 'run') entries.push(fresh.get(p.impl.id)!);
    else if (p.action === 'carry' || p.action === 'stale') {
      const e = p.previous!;
      attachMetadata(e, p.impl);
      // explicit in-row marker: a STALE row keeps its old inputHash (so the next default run
      // re-runs it) and says why it is out of date; a current row never carries the marker
      if (p.action === 'stale') e.stale = p.reason;
      else delete e.stale;
      entries.push(e);
    }
  }

  // re-stamp the review status (entries carried forward from an older artifact may predate it)
  for (const e of entries) e.reviewStatus = reviewStatusOf({ id: e.id, reviewStatus: undefined });

  // Degraded artifact: some row is missing (ALLOW_DROP) or does not measure the current sources
  // (STALE, ONLY_IMPLS). Its frontier and history would be computed from the wrong row set, so
  // both are frozen at their previous values: no point is appended to the append-only history.
  const stale = plans.filter((p) => p.action === 'stale');
  const degraded = missing.length > 0 || stale.length > 0;

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

  const { series: history, changed: historyChanged } = degraded
    ? { series: loadHistory(), changed: false }
    : recordHistory(
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

  const frontier = degraded && previousArtifact?.frontier !== undefined
    ? previousArtifact.frontier
    : {
        // BSV prior art: works as one huge singleton tx, fails BCH limits
        scrypt: anchor(byId('scrypt-bn256'), 'BSV sCrypt · BN254 · huge singleton · ✗ BCH'),
        nchain: anchor(byId('nchain'), 'BSV nChain · BLS12-381 · huge singleton · ✗ BCH'),
        // the wall every BCH submission must get under (per transaction)
        bchPerTxCap: { label: 'BCH per-tx script cap', bytes: SIZE_CAP },
        // smallest BCH-native full verifier so far (the frontier leader)
        leader: leader === undefined ? null : anchor(leader, 'BCH-native full verifier'),
        // best full verifier that fits BCH, or null while the slot is open
        current: bestBchNative === undefined ? null : anchor(bestBchNative, 'Best BCH-native full verifier'),
      };

  const serialize = (at: string) => JSON.stringify({
    schema: SCHEMA_VERSION,
    generatedAt: at,
    statement: {
      proofSystem: 'Groth16',
      // the competition's pinned BN254 target (same curve as the BCH-native work)
      curve: 'BN254',
      note: 'Cross-curve totals are indicative, not apples-to-apples; filter by curve to compare.',
    },
    frontier,
    history,
    entries,
  }, null, 2) + '\n';

  const counts = entries.reduce<Record<string, number>>((a, e) => ((a[e.category] = (a[e.category] ?? 0) + 1), a), {});
  // a no-op run (nothing re-run, no history point, identical content) keeps the previous
  // generatedAt and leaves the file untouched, so it produces no diff
  const unchanged = runs.length === 0 && !historyChanged && previousArtifact?.generatedAt !== undefined && serialize(previousArtifact.generatedAt) === previousText;
  if (unchanged) console.log(`${outfile} unchanged: ${entries.length} entries (${JSON.stringify(counts)})`);
  else {
    writeFileSync(outfile, serialize(generatedAt));
    console.log(`wrote ${outfile}: ${entries.length} entries (${JSON.stringify(counts)})`);
  }

  if (degraded) {
    if (missing.length > 0) {
      console.error(`ALLOW_DROP: ${missing.length} row(s) missing (${missing.map((p) => p.impl.id).join(', ')}); history and frontier frozen; not publishable`);
      const anchors = Object.values((frontier ?? {}) as Record<string, { id?: string } | null>).map((a) => a?.id).filter((id): id is string => id !== undefined);
      const dangling = anchors.filter((id) => byId(id) === undefined);
      if (dangling.length > 0) console.error(`  the frozen frontier names id(s) with no row in this artifact: ${dangling.join(', ')}`);
    }
    if (stale.length > 0) console.error(`STALE: ${stale.length} carried row(s) do not match their current inputs: ${stale.map((p) => p.impl.id).join(', ')}\n  history and frontier frozen; run the default export before publishing`);
    process.exit(2);
  }
};

await main();
