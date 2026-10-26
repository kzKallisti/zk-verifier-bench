# zk-verifier-bench

A benchmark harness for **Groth16 proof verifiers on the Bitcoin Cash VM**.
Every entry is executed on the BCH 2026 virtual machine (libauth); the harness

1. **proves correctness** — the valid proof run is ACCEPTED, and tampered,
   worst-case, and adversarial-input runs are REJECTED;
2. **measures cost** — total on-chain bytes (the score), op-cost, serialized-tx
   overhead, and dead-weight padding; and
3. **checks deployability** — consensus limits, mempool standardness, and
   packaging on the real BCH VMs.

Results are exported (`pnpm benchmark:json`) as `results.json` +
`score-history.json`, which feed a public leaderboard website. The verifier
contracts themselves — the CashScript source, the chunk generators, and the
design writeups — live in the open-source companion repo
[`groth16_cashscript`](https://github.com/mr-zwets/groth16_cashscript).

## Why

BCH keeps Bitcoin's per-input consensus limits: a 10,000-byte script-size cap
and an op-cost budget of `(41 + unlockingLength) × 800` (≈8M for a max-size
input). A full Groth16 pairing check — the Fp→Fp2→Fp6→Fp12 field tower, the
Miller loop, the final exponentiation — does not fit in one input, so a
deployable verifier must be split across many inputs and/or transactions.
There are several ways to do that split, and several ways to shrink each piece.
This harness grades all of them on a level field: one primary score (total
on-chain bytes — bytes are fees), hard correctness gates, and secondary columns
for op-cost and deployability.

Groth16 itself is not the end goal — it requires a circuit-specific trusted
setup and, being pairing-based, is not post-quantum safe. But it is the
industry-standard succinct verifier (smallest proofs, cheapest verification),
which makes it the right first target: building it tests the practical
viability of ZKPs on BCH and surfaces the BCH-specific problems any proof
system will hit — chunking, multi-tx state hand-off, op-cost padding — along
with the tooling to solve them.

Two real BSV mainnet verifiers (`nchain`, BLS12-381; `scrypt-bn256`, BN254) are
included as reference baselines — they established the starting point and show
that a monolithic single-tx verifier cannot run within BCH's limits — but the
benchmark's focus is the BCH-native entries competing below them.

## Quick start

```
pnpm install
pnpm fetch            # download the reference verifier artifacts from WhatsOnChain
pnpm benchmark        # run the leaderboards
pnpm benchmark:json   # export results.json + score-history.json (incremental, see below)
```

`pnpm benchmark` takes positional substring filters on the entry id
(`pnpm benchmark genpow`, `pnpm benchmark singleton chunked`); `--demos`
includes the demo entries.

### Incremental export

`pnpm benchmark:json` is incremental: it re-runs only the entries whose inputs
changed and carries every other row of the existing `results.json` forward
unchanged. Each row stores an `inputHash` (`src/harness/input-hash.ts`), a
SHA-256 over

- the implementation module, with comments, formatting and the `name`,
  `source` and `reviewStatus` values stripped (it is hashed as printed AST);
- any local module it imports (outside `src/harness`); an imported non-code
  module (e.g. a JSON import) is hashed as raw bytes;
- every `src/...` / `data/...` file named by a string literal in those
  modules (the vectors JSON, the reference tx hex), byte for byte. A `data/`
  file listed in its folder's committed `SHA256SUMS` is hashed through that
  pinned digest (and must match it when present);
- its red-team file `src/bch/redteam/<id>.json` (its absence too);
- the **harness fingerprint**, computed automatically: the printed AST of every
  `src/harness/*.ts` except `review-status.ts`, `export-json.ts`,
  `input-hash.ts` and `audit-deps.ts` (in `benchmark.ts` the implementation
  imports and the `REGISTRY` list are left out, so registering an entry re-runs
  only that entry). The row builder `entryOf` lives in `entry.ts` and is
  covered;
- the installed versions of every dependency and build tool in `package.json`
  (libauth, `@noble/curves`, typescript, tsx; not `@types/*`), and
  `HARNESS_VERSION`.

So any code edit to the measurement harness (VM wrapper, benchmark, gates,
red-team, adversarial, tamper, row shape) re-runs every entry, with no version
bump to remember. A typescript upgrade also re-runs everything, because the
normalized code is the typescript printer's output. `HARNESS_VERSION` remains as
a manual knob for changes the fingerprint cannot see (for example a Node.js
upgrade). `export-json.ts` is excluded because it only plans the export and
recomputes the frontier and history from the rows on every run.

Metadata is never an input: renaming an entry, editing its source text or
comments, or changing `review-status.ts` re-attaches the new metadata to the
carried row without a re-run. The frontier (leader / current) and the score
history are recomputed from the merged rows, and rows are always emitted in
registry order. A no-op run leaves `results.json` untouched, including
`generatedAt`.

| variable | effect |
|----------|--------|
| (none) | re-run new entries, rows without `inputHash`, and rows whose hash changed |
| `FULL=1` | re-run every entry (SKIP_IMPLS ones still skipped) |
| `ONLY_IMPLS=a,b` | re-run exactly these ids (exact match; bypasses SKIP_IMPLS) and carry every other row. A carried row whose inputs changed is **STALE**: the artifact is written, but the history and frontier are frozen at their previous values and the export exits 2. Never publish from such a run; the next default run re-runs the stale rows |
| `SKIP_IMPLS=genpow` (default) | never re-run these unless forced. Their last row is carried forward while its inputs are unchanged (a legacy row without `inputHash`: while its registered name and source still match). Once their inputs change (including any harness edit), the export **fails** and leaves `results.json` and `score-history.json` untouched: re-run with `SKIP_IMPLS='' pnpm benchmark:json` |
| `ALLOW_DROP=1` | write the artifact even though a SKIP_IMPLS row is dropped or a row is absent; history and frontier are frozen so no false point enters the append-only `score-history.json` |
| `ALLOW_MISSING_DATA=1` | under `FULL=1`, carry an unchanged row whose `data/` file is missing instead of failing |
| `STAMP_HASHES=1` | bootstrap: give rows that have no `inputHash` the current hash without re-running. Only use it when the artifact is known to match the sources |
| `SKIP_DEPS_AUDIT=1` | skip the dependency audit that `pnpm benchmark:json` runs first |

`SKIP_IMPLS='' FULL=1 pnpm benchmark:json` is the old complete export. A publish
uses the default (or `FULL=1`) mode, never `ONLY_IMPLS`.

Rows are never dropped silently, and the score history only ever gets points
computed from a complete, current row set. A row whose id is no longer
registered leaves the feed (logged). An entry whose `data/` file is missing (the
gitignored nChain / sCrypt mainnet tx hex; `pnpm fetch` restores it and checks
the pinned digest) is carried forward only while its hash, computed through the
pinned digests, still matches its row; if anything else about it changed, or
with no previous row, the export fails and asks for `pnpm fetch`. A load failure
during a re-run aborts the export and leaves `results.json` untouched.

`pnpm benchmark:json` first runs `pnpm benchmark:deps`, the dependency audit: it
traces every file the implementations actually read or list (at import and in
`load()`: `readFileSync`, `openSync`, `readFile`, `createReadStream`,
`fs.promises.readFile` / `open`, and directory listings) and fails if any read
is missing from that entry's input hash, for example a file opened through a
computed path. Reads by the ESM loader (JSON imports) are not traced; those are
hashed statically.

## Leaderboards

Entries are grouped by **category** and **curve**; the score is **total
on-chain bytes** (locking + unlocking + serialized-tx overhead, with dead-weight
zero-padding reported separately). Lower is better. Current numbers live in
`results.json` — the README deliberately doesn't hard-code them.

| category | meaning |
|----------|---------|
| `full` | a complete Groth16 verifier |
| `partial` | a sub-verifier milestone (`vkx-*`: the public-input MSM; `pairing-*`: the pairing check) |
| `spec` | a full verifier targeting the **proposed** bch-spec VM (see below), kept out of the current-BCH ranking |
| `demo` | toy entries validating harness mechanics |

Both curves are covered throughout: **BN254** (32-byte field elements) and
**BLS12-381** (48-byte), so each reference verifier has same-curve BCH
counterparts.

## Why these measures

Bytes rank because they are what a user pays in fees, but two secondary
measures carry the project's findings:

- **Op-cost.** The per-input budget scales with script length, so entries buy
  compute with zero-padding, and the smallest-byte builds are only small
  because they ignore compute. Reporting op-cost keeps the byte score honest
  and shows what a budget-formula change would save.
- **The consensus / standard / bch-spec categories.** Each rule set has a
  different optimal design, so each is benchmarked in its own right: intra-tx
  bundles are best when the complete graph fits one standard transaction, the
  grouped form preserves standard relay for graphs that exceed that limit, and
  the proposed bch-spec limits admit a much flatter split. Comparing the
  winners shows what each rule change is worth.

## Entry families

~40 entries are registered (`REGISTRY` in `src/harness/benchmark.ts`); they
factor into families along two axes — *deployment structure* and *optimization
variant*:

| family | ids | structure |
|--------|-----|-----------|
| references | `nchain`, `scrypt-bn256` | real BSV mainnet verifiers, single-tx; fail BCH limits |
| singletons | `bch-groth16[-bls12381]-singleton[-opcode-optimized\|-genpow\|-minop]` | full verifier in ONE script — runtime-general correctness oracles; exceed one input's op-cost budget on current BCH |
| chunked / covenant | `…-chunked`, `…-chunked-covenant[-residue]` | computation split into chunks; state threaded through an NFT commitment across a chain of transactions |
| intra-tx | `…-intratx[-residue]` | all chunks are inputs of ONE transaction, binding each other via `OP_INPUTBYTECODE`; the BN254 quotient-torus fixture is below standard policy's 100 kB transaction limit |
| grouped | `…-grouped[-residue]` | the hybrid: intra-tx binding inside a handful of standard (<100 kB) transactions, with NFT hand-off between them; standard-relayable for graphs that exceed one standard transaction |
| spec | `…-intratx-residue-large` | 100,000-byte-script builds for the proposed bch-spec VM |
| partials | `bch-vkx-*`, `bch-pairing-*` | vk_x MSM and pairing-check milestones in the same structures |
| demo | `bch-multistep-demo` | hash-chained multi-tx demo |

Optimization variants, roughly in the order they were developed:
**opcode-optimized** (size-golfed codegen), **genpow** (smallest
source-reproducible singleton), **minop** (op-cost-minimized, trading bytes for
budget), **residue** (replaces the final-exponentiation hard part with a
witnessed `c^λ` residue check — the single biggest score win), and **GLV**
(endomorphism-split vk_x MSM inside the residue builds).

## How it works

The unit of execution is a `Step` (one locking + unlocking pair = one input's
script evaluation). A single-tx verifier is one step; covenant, intra-tx, and
grouped entries are ordered step lists whose cross-step continuity the harness
reproduces faithfully (synthetic token-carrying transactions for covenants, a
real shared transaction for intra-tx/grouped inputs). See `docs/benchmark.md`
for the full contract.

Five VMs (`src/harness/vm.ts`):

- **loosened** BCH 2026 VM — every resource ceiling lifted; proves correctness
  and measures op-cost even for oversized entries;
- **real** BCH 2026 VM — consensus limits; decides `BCH compatible`;
- **standard** BCH 2026 VM — mempool-relay policy; decides standardness;
- **real + standard bch-spec VMs** — the proposed upgrade (100,000-byte
  scripts, op-cost budget `(10,000 + len) × 800`); grades `vm: 'bch-spec'`
  entries only.

### Grading dimensions

Beyond accept/reject on the committed proof, entries are graded on:

- **proof-generality** — for `proofBinding: 'runtime'` entries the harness runs
  several distinct valid proofs minted under the same verifying key against the
  one fixed locking (N/N must verify); a baked entry would accept only its own.
  See `docs/proof-generality.md`.
- **worst-case proof** — a dense, near-r-input proof run through the same
  locking, so op-cost claims hold at the worst case, not just the committed
  proof.
- **input validation** — adversarial witnesses carrying off-curve or
  out-of-subgroup points must be rejected (EIP-197-style on-curve + subgroup
  checks).
- **standardness** — does every step also relay (`fitsBchStandardness`), or is
  the entry consensus-valid but non-standard (e.g. bare intra-tx bundles)?
- **secure packaging** — P2SH20-packaged entries are flagged (collision-attack
  surface).
- **honest byte accounting** — all-zero padding pushes (bought op-cost budget)
  and per-structure serialized-tx overhead are folded into the score so
  single-tx, covenant-chain, and grouped entries compare fairly.

## Not every Groth16 is alike

Cross-entry totals mix factors that have nothing to do with implementation
quality:

- **Curve.** BLS12-381 field elements are 1.5× BN254's; bigger curve, bigger
  scripts. Compare within a curve line first.
- **Statement.** Each verifies a different circuit with a different verifying
  key and public-input count (which sets the vk_x MSM size).
- **Deployment model — proof at runtime vs baked per-proof.** The references
  and the singletons are *runtime-general*: the proof arrives push-only in the
  unlocking at spend time, so one deployed program verifies any proof for its
  circuit. The chunked / intra-tx / grouped entries are *instance-specific*:
  proof material is baked into the chunk scripts, so a different proof requires
  regenerating the chunks. Both genuinely verify on-chain, but they are
  different artifacts; the harness reports `proofBinding` per entry and proves
  the distinction empirically via the multi-proof sweep.

So a cross-entry "N× larger" on totals is indicative, not a clean benchmark;
per-milestone comparisons are normalized instead (same scalar, fixed-iteration
loops — see `docs/checkpoints.md`).

## Scripts

| script | what |
|--------|------|
| `pnpm benchmark [id-filter ...]` | run entries and print the leaderboards |
| `pnpm benchmark:json` | export `results.json` + `score-history.json` (incremental; `FULL=1`, `ONLY_IMPLS=a,b`, see above) |
| `pnpm benchmark:deps` | check that every file an entry reads is covered by its `inputHash` |
| `pnpm gen:multiproof` / `gen:multiproof-bls` | mint extra distinct valid proofs under the fixed VK (proof-generality) |
| `pnpm checkpoints` | compute/validate the BN254 golden checkpoints (vk_x + Miller boundary) |
| `pnpm checkpoints:pairing-gen` / `checkpoints:pairing` / `checkpoints:pairing-basis` | pairing-milestone vectors, grading, Fp12-basis probe |
| `pnpm bch:fp-mul` | measure a single BN254 field multiply's op-cost |
| `pnpm bch:vkx` / `bch:vkx-scalarmult` / `bch:vkx-scalarmult-sweep` | standalone vk_x measurements |
| `pnpm fetch[:nchain\|:scrypt-bn256]` | download reference artifacts from WhatsOnChain |
| `pnpm nchain:extract` / `nchain:run` / `nchain:verify` | reference verifier tooling |
| `pnpm scrypt-bn256:extract` / `:run` / `:verify` / `:find-vkx` | reference verifier tooling |
| `pnpm typecheck` | `tsc --noEmit` |

## Layout

```
src/harness/          types, VMs, tamper, benchmark runner, JSON exporter
src/implementations/  one module per entry (registered in benchmark.ts)
src/bch/              BCH-native vectors (committed JSON) + primitive measurements
src/checkpoints/      off-chain BN254 golden checkpoints (vk_x, Miller boundary, pairing)
src/nchain/           nChain reference extract/run/verify
src/scrypt-bn256/     sCrypt reference extract/run/verify
data/<impl>/          SOURCE.md provenance (raw hex is gitignored, re-fetchable)
docs/                 benchmark.md, checkpoints.md, proof-generality.md,
                      pairing-checker.md, scrypt.md
results.json          committed leaderboard export (consumed by the website)
score-history.json    committed per-run score history
```

## Contributing

External verifier submissions are welcome — several leaderboard entries
arrived as PRs. A submission is vectors JSON + an implementation module + a
one-line registry edit; your contract source and build tooling can stay
private, because the harness grades behavior (correctness gates, multiproof
generality, worst-case runs) rather than source. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Related repos

- [`groth16_cashscript`](https://github.com/mr-zwets/groth16_cashscript) —
  the verifier contracts (CashScript source, `singleton/` and `chunked/`
  generators) and the design docs (`verifiers.md`, compiler-fork and
  stack-rescheduler writeups). This repo consumes its generated vectors.
- The leaderboard website that renders `results.json` (closed source).

## Notes

- libauth `@bitauth/libauth@3.1.0-next.8` provides the BCH 2023/2025/2026 VMs
  and the bch-spec VM; `@noble/curves` provides the off-chain BN254/BLS12-381
  references.
- A step can be tagged `checkpoint: "<label>"`; the benchmark then reports the
  cumulative op-cost + bytes to reach it (`docs/checkpoints.md`).
- Large raw-hex and disassembly artifacts are gitignored; each `data/<impl>/`
  folder keeps a `SOURCE.md` with provenance and the commands to regenerate.
