# What does op-cost cost in real CPU time?

Track 1 synthesis (opcost-timing). Date: 2026-10-27. One machine: AMD Ryzen 9 7900 (Zen 4, 12C/24T, 2 CCDs), Linux 7.2.8, governor and EPP `performance`, boost on.

- Component reports: [BCHN.md](BCHN.md) (BCHN calibration), [KERNELS.md](KERNELS.md) (BCHN kernel extrapolation of the singletons), [FULL.md](FULL.md) (bchd-fork and libauth, all workloads, opcode-class profiles), [data/cross-engine.md](data/cross-engine.md).
- Two independent reviews (REVIEW-1/2 in the work tree) re-ran the key measurements. Their findings are folded in here.

## Question
The byte-floor singletons need far more op-cost than a byte-tied budget grants:
- BN genpow: 4,613 B, 5.52 G op-cost
- BN opcode-optimized: 6,237 B, 800 M
- BLS opcode-optimized: 5,999 B, 1.0 G
- BLS genpow: 5,965 B, 25.6 G

Is that excess real validation work, or an artefact of how op-cost prices bignum arithmetic?

## Answer
**Mostly real work.** Op-cost charges this bignum arithmetic 5–18× more per nanosecond than it charges signature checks, and 2–6× more than the VM-limits arithmetic vectors. The overrun is much larger than that slack, so what remains after the discount is real CPU time.

- **Calibration point.** On stock BCHN v29.1.0, the calibration worst case `l0fhm3` (packed 1-of-3 bare multisig, 100 kB standard tx) costs **1.43 ns per op-cost unit, 1.25 ns per budget unit and 1,000 ns per transaction byte**. Signature checking and hashing cost 1.3–1.7 ns per op-cost unit; the VM-limits arithmetic vectors cost 0.52–0.73.
- **Our verifiers.** Their bignum work costs **0.12–0.24 ns per op-cost unit** on BCHN:
  - BN sound-native: 0.170–0.174 (measured)
  - BLS sound-native: 0.124–0.126 (measured)
  - singletons: 0.12–0.24 (kernel extrapolation)
- **Singletons.** Their op-cost is 117–5,327× a P2SH32-style BCH 2026 budget. After op-cost's 5–10× slack on this work, a singleton spend would still cost **16–1,007× l0fhm3's CPU per budget unit** (≈ per score byte) on BCHN, if such a spend were admitted. The singletons are consensus-invalid today; nothing here is a statement about live exposure.
- **Sound-native chains.** These are BCH 2026 consensus-valid and cost **0.09–0.13× l0fhm3 per transaction byte**: 3.5 ms and 3.0 ms of BCHN script time per verification.

## Headline: BCHN, by budget basis
BCHN script-validation time per singleton spend comes from KERNELS.md: BCHN kernels, with the extrapolation validated on bchd and libauth to within +4.3% / −0.4%. The `l0fhm3` reference is BCHN.md run 2. The table is computed by `report-multiples.py` (output in `report-multiples.md`).

Every multiple names its budget base:
- **P2SH32 (primary).** The standard deployment pushes the script in the unlocking bytecode. The BCH 2026 budget is then (41 + 3 + script + proof bytes) × 800. This is within 1% of KERNELS.md's "× l0fhm3 per score byte" column.
- **Bare locking (as measured).** The 4.6–8.2 kB script sits in the spent output's locking bytecode, so only the 265–459 B unlocking counts.
  - This deployment is non-standard: the P2S locking cap is 201 B.
  - The VM-limits CHIP leaves UTXO bytes out of the budget on purpose ("Use of Input Length-Based Densities").
  - It inflates the multiples about 20×.
- **bch-spec.** The libauth `BCH_SPEC` density base: (10,000 + 3 + script + proof bytes) × 800, P2SH-style.

| singleton (score B) | op-cost | BCHN est. | ns / op-cost | op-cost ÷ budget: **P2SH32** / bare / bch-spec | CPU × l0fhm3 per budget unit: **P2SH32** / bare / bch-spec |
|---|--:|--:|--:|---|---|
| BN plain (8,206) | 771 M | 148.5 ms | 0.192 | **117** / 3,080 / 53 | **18** / 474 / 8.1 |
| BN opcode-optimized (6,237) | 800 M | 155.0 ms | 0.194 | **159** / 3,196 / 62 | **25** / 495 / 9.5 |
| BN genpow (4,613) | 5,520 M | 916 ms | 0.166 | **1,482** / 27,709 / 472 | **197** / 3,677 / 63 |
| BLS plain (7,510) | 995 M | 120.5 ms | 0.121 | **165** / 2,838 / 71 | **16** / 275 / 6.9 |
| BLS opcode-optimized (5,999) | 1,004 M | 124.8 ms | 0.124 | **208** / 2,864 / 78 | **21** / 285 / 7.8 |
| BLS genpow (5,965) | 25,610 M | 6.06 s | 0.237 | **5,327** / 130,130 / 2,005 | **1,007** / 24,609 / 379 |

The question's "~30–1000×" corresponds to no single base:
- P2SH32 BCH 2026: 117–5,327×
- bare: 2,838–130,130×
- bch-spec: 53–2,005×

Across a row, the op-cost multiple divided by the CPU multiple (5.3–10.3×) is op-cost's slack on this work relative to l0fhm3.

Sound-native chains, measured whole on BCHN (run 2; re-runs within ±3%):

| chain | tx B | inputs | op-cost | BCHN µs | ns / op-cost | × l0fhm3 per op-cost unit | × l0fhm3 per budget unit | × l0fhm3 per tx byte |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| bn254-sound-native | 27,519 | 3 | 20.57 M | 3,578 | 0.174 | 0.122 | 0.130 | 0.130 |
| bls12381-sound-native | 34,089 | 4 | 24.04 M | 3,032 | 0.126 | 0.088 | 0.089 | 0.089 |

In absolute terms, one opcode-optimized singleton would take about 0.12–0.16 s of BCHN script time. That is about the same as validating the worst standard 100 kB transaction (l0fhm3, 0.10 s). It is not "harmless": per byte it is still 16–25× l0fhm3. The genpow builds would take 0.9 s (BN) and 6.1 s (BLS).

## Accounting versus real work: one statement
Op-cost charges our bignum work:
- **5–18× more per ns than signature checks.** l0fhm3 runs at 1.43 ns/op-cost; every kernel runs at 0.08–0.26.
- **2–6× more than the VM-limits arithmetic vectors**, which run at 0.52–0.73 ns/op-cost on BCHN.

That slack explains why the CPU multiples are 5–10× smaller than the op-cost multiples. It does not explain the overrun: after the discount, the singletons remain 16–1,007× l0fhm3 per P2SH32 budget unit.

"Overcharge" is always relative to a reference. Two caveats:
- **Small-operand arithmetic is under-priced.** Inside our verifiers, add/sub/compare on small operands costs more per op-cost unit than OP_MUL/OP_MOD on large ones: in bchd, 1.25–1.9 against 0.22–0.57 ns per op-cost unit. It takes 21–28% of the time for 3–9% of the op-cost. It is still well below signature checking.
- **BLS genpow is the most expensive build per op-cost unit:** 0.237 ns on BCHN, 1.9× the BLS chain rate. It runs 13 M OP_MULs on small operands, and op-cost prices each one's fixed per-instruction cost low.

## Reference set: what "worst case" means here
- **l0fhm3 is the right anchor for 2026-valid vectors.**
  - It is the CHIP's BCHN calibration point.
  - The rig reproduces the CHIP's RelCost: l0fhm3/trxhzt = 1,293× in run 2 and 1,305–1,314× in the re-runs, against the CHIP's 895–1,380× on three CPUs.
  - On BCHN it is the top vector per transaction byte, and per budget unit it ties with xuxr6e.
- **Coverage.** All `*benchmarks*` vectors in `bitauth/vmb_tests` 08133da for `bch_2026_standard` and `bch_2026_nonstandard`: 293 vectors, 310 timed workloads including baselines and verifiers.
- **Gaps.**
  - Some CHIP per-category worst cases are absent: n4qn5c, vdqk6h, the m-of-20 multisig ids (c7ykrf, ux6mm3, vh54kr, t29ktg) and some bigint ids. They are 2023-pack vectors that are now in `bch_2026_invalid` or outside the benchmark files.
  - **There are no 2026 loops/functions benchmark vectors**, so there is no reference dense in OP_DEFINE/OP_INVOKE or loops. That class matters here: libauth spends 17–23% of singleton time in control/OP_INVOKE.
  - "Worst case" in this report therefore means "worst among the published 2026 benchmark vectors".

## Engines
- **BCHN is the headline engine.** All multiples above come from BCHN.md and KERNELS.md only.
- **bchd-fork and libauth validate the method and supply profiles.**
  - On the kernels, BCHN is 2.2–2.5× faster than bchd and 11–14× faster than libauth.
  - The per-kernel bchd/BCHN rate ratio is uniform: median 2.42, range 1.99–2.72 over 93 kernels. This supports carrying the kernel method over to BCHN.
  - On the 231 VM-limits vectors, bchd/BCHN time has a median of 1.04 overall but 3.09 for signature checking (Go secp256k1 against libsecp256k1). So bchd's multiples against l0fhm3 are about 1.5× smaller than BCHN's.
  - FULL.md's bchd multiples (e.g. 2,365× for BN genpow) are not comparable with BCHN's (3,677×).
- **One mode per engine.** Steady state (no forced GC per repetition) matches block validation, and KERNELS.md uses it. FULL.md's bchd and libauth runs force GC before each repetition. Quiet re-run (REVIEW-1), steady vs forced GC:

  | workload | BCHN | bchd steady / forced-GC | libauth steady / forced-GC |
  |---|--:|--:|--:|
  | bn254-sound-native | 3.49 ms | 9.04 / 7.69 ms | 46.1 / 67.8 ms |
  | l0fhm3 | 96.4 ms | 334.3 / 334.1 ms | 4,680 / 4,771 ms |
  | bn254-sound-native / l0fhm3 per op-cost unit | 0.123 | 0.092 / 0.078 | 0.034 / 0.048 |

  The verifier-to-l0fhm3 ratio depends on the engine (libsecp256k1, Go big.Int, JavaScript BigInt). It also depends on the mode, by up to about 17% in bchd and 40% in libauth. That is why only BCHN figures are used for the headline.
- **FULL.md's libauth absolute times are 20–33% high.**
  - Causes: contention (CPU 10 shared the CCD's L3 with BCHN and bchd) and forced GC.
  - FULL.md's libauth worst-case ranking (ly54y8 ahead of l0fhm3) reverses on a quiet machine.
  - Quote libauth only as ratios, or with ±30%.

## OP_DEFINE accounting: libauth differs from BCHN (consensus)
- **The difference.** BCHN and bchd charge each OP_DEFINE's pushed function body as pushed bytes. libauth 3.1.0-next.8, which the harness uses, charges 100. For every verifier and every kernel, bchd's op-cost equals libauth's plus the executed OP_DEFINE body bytes.
- **Confirmed on BCHN with the script error.**
  - The `defcharge-gap` probe (budget 826,400; libauth op-cost 577,192) is rejected in a block with `blk-bad-inputs`.
  - `testmempoolaccept` gives `mandatory-script-verify-flag-failed (VM cost limit exceeded)` (`data/bchn-rev3/rejects-results.jsonl`).
  - The `defcharge-fits` probe differs only in pad length, and BCHN accepts it.
- **Harness impact.** The op-cost and margins in results.json come from libauth. Under BCHN accounting, the sound-native margins are 12.8 k–14.5 k smaller per input. Every input still fits: the smallest BN margin is 442,456. BCHN accepted both chains on every rep (11 of 11), on every node that ran them.

## Rigor and reproducibility
- **BCHN setup.**
  - Stock v29.1.0 binaries, unmodified.
  - A fresh regtest datadir per run, unique ports, the 2026 VM from genesis, `acceptnonstdtxn=1`.
  - Script and signature caches set to 0 (BCHN logs "able to store 2 elements"), `par=1`, `debug=bench`.
  - Each workload is a block of K copies of a new tx. The time is BCHN's own "Verify N txins" line over 11 `validateblocktemplate` reps, followed by a final `submitblock`.
  - The node is pinned with taskset to CPU 9; the driver runs on another core.
- **Verdicts.**
  - Every row's accept/reject was checked against libauth and BCHN.
  - bchd and libauth check the verdict and op-cost on every evaluation (0 mismatches).
  - The BCHN rig now records every rep's verdict (`repVerdicts`). In `data/bchn-rev3`, all 22 accepted workloads passed 11 of 11 reps.
  - For expected rejections, the rig records BCHN's mempool script error. Both tampered sound-native proofs give `Script failed an OP_EQUALVERIFY operation`. libauth reports the same failure at input 0 as "failed an OP_VERIFY operation", because its OP_EQUALVERIFY is OP_EQUAL followed by OP_VERIFY.
- **Repeats.**
  - BCHN: 11 reps per block. Independent fresh nodes (run1, run2, kern-a/b, rev1, rev2, rev3) agree within −4% to +3.5%. BN sound-native gave 3,578 / 3,536 / 3,546 / 3,490 / 3,519 / 3,490 µs; l0fhm3 gave 100.0 / 97.6 / 96.4 / 96.4 ms.
  - bchd and libauth: two passes, the second in reverse order. Kernel sums against full runs are 0.996–1.043; an independent re-run gave 1.015 and 1.020.
- **Parse vs evaluation.**
  - Kernel time is the kernel tx minus a control tx, which cancels parsing and per-input overhead.
  - For whole verifiers, setup is under 0.5%. bchd's forced-GC mode separates it: 21–336 µs.
  - BCHN times and the steady-mode bchd/libauth figures include parsing.
- **Not controlled.**
  - SMT siblings were not reserved, and boost cannot be disabled without root.
  - The effective clock was not measured (no perf/turbostat). `scaling_cur_freq` was sampled on the node CPU every 0.5 s during rev3: 3.0 GHz when idle, up to 5.26 GHz under load.
  - Same-day absolute times drift 2–4% between loaded and quiet periods. Ratios from the same run are robust to this.

## Uncertainty and limits
- **Absolute BCHN singleton times are ±5% on this CPU.** That covers the kernel method's bias (+2% on average, up to +4.3%) and run-to-run variation. BCHN never ran a whole singleton, so a BCHN-only effect that appears only in long single-input evaluations would not show.
- **The × l0fhm3 multiples are order-of-magnitude figures from one machine.** Bignum code and libsecp256k1 scale differently across CPUs. The CHIP's own l0fhm3/trxhzt ratio is 895–1,380 across three CPUs, and l0fhm3 varies by about ±4% across our runs.
- **The bare-locking multiples describe a non-standard deployment.** Quote the P2SH32 figures.
- **Out of scope.** Nothing here proposes a limit change or claims a DoS risk on today's network. The singletons are consensus-invalid under BCH 2026; the figures say what a validator would pay if a rule admitted them.

- **bchd signature-vector timings are inflated.** The fork-based bchd driver used for FULL.md hashed all spent outputs again on each input's first signature check, while block validation does it once per transaction. That inflates bchd's signature-heavy vector timings and their bchd multiples (l0fhm3 392 → 254 ms with the driver fixed, measured on upstream bchd). The BCHN headline is unaffected. Separately, upstream bchd's script engine has since been made 2–2.7× faster on these verifiers ([gcash/bchd#764](https://github.com/gcash/bchd/pull/764)), so bchd per-unit figures are a snapshot of the engine as tested.

## Files
Scripts are in zk-verifier-bench `research/opcost-timing/`:
- BCHN rig: `bchn/` (`node.sh`, `rig.ts`, `run.ts`, `run-all.sh`, `run-verdicts.sh`, `summarize.ts`)
- workload export: `export-workloads.ts`, `make-units.ts`
- libauth timing: `libauth-time.ts`, `libauth-trace.ts`, `kernels/libauth-steady.ts`
- kernel method (profiler, extractor, estimator): `kernels/`
- bchd driver patches: `bchd-opcost-bench.patch`, `bchd-opcost-kernels.patch`
- analysis: `analyze.mjs`, `cross-engine.py`, `report-multiples.py`

Summaries: `data/` (including `data/bchn-rev3/`), `kernels/data/`, `report-multiples.md`.

Raw data (local only): `work/opcost-timing/raw/` (BCHN runs; the reviewers' re-runs are under `raw/review/`), `full/` and `kernels/`.
