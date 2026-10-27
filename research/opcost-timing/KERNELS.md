# What the byte-floor singletons would cost BCHN: kernel extrapolation

Task opcost-kernels (track 1). BCHN cannot run the over-budget singletons. Instead, each singleton's execution is cut into the outermost function calls that fit one BCH 2026 input. Those calls run on BCHN as consensus-valid kernels, and the singleton's time is the sum over kernels weighted by op-cost. The same kernels run on bchd-fork and libauth, where the whole singleton can also be timed. On those two engines the kernel sum matches the full run to within 0.4–4.3% for all six singletons.

## Result

**Estimated BCHN v29.1.0 script-validation time for one singleton spend.** Times are for one core of a Ryzen 9 7900, extrapolated from the kernels measured on BCHN. The extrapolation's own uncertainty is about ±5%: 2 to 4% kernel-sum bias on the validating engines, plus 1 to 2% run-to-run variation.

| singleton | op-cost | BCHN estimate | BCHN ns / op-cost | BCH 2026 budget | ns per budget unit | × l0fhm3 per budget unit | µs per score byte | × l0fhm3 per score byte |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| BN plain (`bch-groth16-singleton`, 8,206 B) | 771 M | **148.5 ms** | 0.192 | 250,400 | 593 | 474 | 18.1 | 18 |
| BN opcode-optimized (6,237 B) | 800 M | **155.0 ms** | 0.194 | 250,400 | 619 | 495 | 24.9 | 25 |
| BN genpow (4,613 B) | 5,520 M | **916 ms** | 0.166 | 199,200 | 4,598 | 3,676 | 199 | 199 |
| BLS plain (7,510 B) | 995 M | **120.5 ms** | 0.121 | 350,400 | 344 | 275 | 16.0 | 16 |
| BLS opcode-optimized (5,999 B) | 1,004 M | **124.8 ms** | 0.124 | 350,400 | 356 | 285 | 20.8 | 21 |
| BLS genpow (5,965 B) | 25,610 M | **6.06 s** | 0.237 | 196,800 | 30,776 | 24,601 | 1,015 | 1,015 |

The l0fhm3 reference is the worst VM-limits vector on the same BCHN rig (BCHN.md, run 2): a packed 1-of-3 bare multisig. It costs 1.251 ns per budget unit and 1,000 ns per transaction byte.
- **Budget:** what the VM grants the singleton's own spend, (41 + unlocking bytes) × 800.
- **Score bytes:** locking plus unlocking bytes, the per-byte basis BCHN.md used.
- **Per transaction byte of the 265–459 B spends:** the multiples are 262× (BLS plain) up to 22,851× (BLS genpow). See results/summary.md.

**What this means.**
- **The overrun is real CPU time.** Under BCHN's own budget, a block validator would spend 275 to 24,600 times more CPU per granted budget unit than on the worst case the 2026 limits were calibrated on. Every kernel runs at 0.08 to 0.26 ns per op-cost unit. That sits close to the sound-native chains (0.172 BN, 0.124 BLS in the same runs) and 5.5 to 18 times below l0fhm3's 1.43 ns per op-cost unit. The 30–130,000× op-cost overrun therefore converts almost one to one into CPU time.
- **The overrun is not an accounting artefact.** Op-cost overcharges this arithmetic by about one order of magnitude compared with signature checks. That is why the multiples per budget unit are about 5–10× smaller than the op-cost multiples.
- **BCHN.md's assumption holds for 4 of 6.** BCHN.md assumed the singletons cost what the chains cost per unit (0.12–0.18 ns), and that holds within about ±13% for the plain, opcode-optimized and BN genpow builds.
  - BN genpow: 916 ms, inside BCHN.md's 0.66–0.99 s.
  - BN opcode-optimized: 155 ms, slightly above its 96–144 ms.
  - BLS opcode-optimized: 125 ms, inside 120–180 ms.
  - BLS genpow: the exception, at 0.237 ns per unit, 1.9× the BLS chain rate. Its kernels are dominated by small-operand OP_MULs, which op-cost prices low relative to their fixed per-instruction cost (FULL.md's profile: about 545 ns per OP_MUL in bchd). Its BCHN time, 6.06 s, is 1.3–2× BCHN.md's 3.1–4.6 s extrapolation.
- **Engines:** on these kernels BCHN is 2.2–2.5× faster than bchd (0.31–0.59 ns per op-cost unit, steady state) and 11–14× faster than libauth (1.7–2.9).

**Validation of the kernel sum** (same estimator, same kernels; the full singleton timed in the same session; mean of two passes):

| singleton | bchd kernel sum | bchd full run | ratio | libauth kernel sum | libauth full run | ratio |
|---|--:|--:|--:|--:|--:|--:|
| BN plain | 321.0 ms | 315.1 ms | 1.019 | 1.67 s | 1.62 s | 1.030 |
| BN opcode-optimized | 344.6 ms | 330.5 ms | 1.043 | 1.74 s | 1.69 s | 1.029 |
| BN genpow | 2.17 s | 2.16 s | 1.006 | 10.59 s | 10.33 s | 1.025 |
| BLS plain | 303.5 ms | 301.2 ms | 1.008 | 1.68 s | 1.61 s | 1.042 |
| BLS opcode-optimized | 313.5 ms | 305.9 ms | 1.025 | 1.70 s | 1.67 s | 1.023 |
| BLS genpow | 15.05 s | 14.90 s | 1.010 | 73.49 s | 73.82 s | 0.996 |

- **Per pass:** the ratios are 0.983–1.058.
- **Bias:** the kernel sum overestimates by +2% on average. That is the direction one expects from running each call in a fresh input with cold caches, rather than inside a hot loop.
- **BCHN times are probably slightly high too:** if BCHN has the same small bias, its times above are high by about 2%.

**OP_DEFINE accounting confirmed on BCHN.** The two `defcharge` transactions define 100 never-invoked functions with a 5,000-byte body. They differ only in pad length.
- **`defcharge-gap`:** budget 826,400, libauth op-cost 577,192. BCHN rejected the block: `blk-bad-inputs`, parallel script check failed.
- **`defcharge-fits`:** budget 1,096,800. BCHN accepted it.

So BCHN charges at least 249,209 op-cost more than libauth for that script, consistent with charging the 500,000 body bytes. bchd reports exactly 577,530 + 500,000 = 1,077,530 for `defcharge-fits` and fails `defcharge-gap` with "vm opcost limit: 826400, script opcost: 830171". For all 324 kernel and control transactions, bchd's op-cost equals libauth's plus the executed OP_DEFINE body bytes. FULL.md's finding therefore holds on the real node, and libauth 3.1.0-next.8 undercounts OP_DEFINE.

## Method

1. **Call-tree profile** (`kernels/profile-calls.ts`). The singleton runs once on the harness's loosened libauth VM. Hooks on every operation track OP_INVOKE frames, and each function gets its calls, inclusive and exclusive op-cost, and the distribution of inclusive op-cost per call. All six singletons are built entirely from OP_DEFINE functions: top-level code is 0.08–0.56% of op-cost.
2. **Cut** (`kernels/extract-kernels.ts`). A function is eligible when every call of it costs at most 7.2 M op-cost. That leaves room under the largest possible one-input budget, (41 + 10,000) × 800 = 8.03 M. A kernel call is an eligible call made while no other kernel call is open: the outermost calls that fit.
   - **Coverage:** kernel calls cover 97.8–99.7% of each singleton's op-cost.
   - **Glue:** the rest is top-level code plus the own instructions of the too-large functions (Miller loop per pair, final-exponentiation drivers, the vk_x MSM driver). It is 0.3–2.2%.
   - **Classes:** kernel calls are grouped into classes of (function, ±1.5% op-cost bucket). For every function holding at least 0.2% of the op-cost, its largest classes are sampled, up to 4 classes or 90% of the function. Classes holding at least 2% of the singleton get three snapshots (the 1st, 8th and last call); the others get one.
   - **Totals:** 162 samples from 90 classes. Directly sampled classes cover 95.3–98.6% of each singleton.
3. **Kernel transaction.** Each snapshot (stack, alternate stack and function table at call entry; stack at exit) becomes one single-input BCH 2026 transaction.
   - **Unlocking:** `<pad> <entry stack items>` plus `<alt items>`.
   - **Locking:** `<body id OP_DEFINE>` for exactly the functions this call reaches, with the singleton's own bytes and ids. Then OP_TOALTSTACK per alt item, `<id> OP_INVOKE`, `OP_DEPTH <n> OP_NUMEQUALVERIFY`, OP_CAT over the items the call produced, `OP_SHA256 <expected> OP_EQUALVERIFY`, drops, and OP_1.
   - **Correctness check:** a kernel only accepts if the call reproduces the singleton's own result bytes.
   - **Pad:** the smallest pad such that (41 + unlocking) × 800 covers libauth op-cost plus the OP_DEFINE body bytes, with a 0.5% margin. The smallest margin under bchd/BCHN accounting is 0.42%.
   - **Sizes:** scripts are up to 1,068 B of locking and 7,598 B of unlocking. Every kernel passes libauth's BCH 2026 consensus VM and BCHN.
4. **Control transaction.** The same unlocking and OP_DEFINEs without the call; it hashes the entry items instead. Call time = time(kernel) − time(control). This cancels transaction and script parsing, the stack pushes, the OP_DEFINEs and the per-input overhead. The median control is 6.8% of its kernel.
5. **Estimate** (`kernels/estimate.ts`).
   - **Class rate:** mean over a class's samples of call time ÷ call op-cost, where op-cost is the call's inclusive libauth op-cost inside the singleton.
   - **Singleton estimate:** Σ class rate × class op-cost.
   - **Unsampled classes of a sampled function:** use that function's op-cost-weighted rate.
   - **Unsampled functions plus glue (1.3–2.9%):** use the singleton's overall weighted rate. Putting them at the minimum or maximum sampled rate instead moves the estimate by at most ±1.5%.
   - **Count-based variant:** mean sample call time × calls per class. It agrees to within 0.2%.
   - **Spread between samples:** the 1st, 8th and last call of a class differ by at most 1.5–10.8% in rate (BCHN), 1.2–5.5% (bchd) and 0.8–2.7% (libauth).

## Kernels (all engines, mean of runs; functions with ≥ 2% of the singleton's op-cost)

Roles are inferred from arity (field elements in → out), cost and call structure; ids are the singletons' own OP_DEFINE identifiers. "Kernel calls" counts only outermost calls. For example, in BN genpow most of 0x1d's 4,429 calls happen inside 0x27.

| singleton | fn | role (inferred) | share | kernel calls | op-cost/call | BCHN µs | BCHN ns/op | bchd µs | bchd ns/op | libauth µs | libauth ns/op |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| BN plain | 0x18 | Fp12 × Fp12 (24 → 12) | 39.8% | 359 | 861,496 | 170.5 | 0.198 | 340.9 | 0.396 | 1,898 | 2.20 |
| BN plain | 0x1d | Fp12 × sparse line (20 → 12) | 25.6% | 352 | 562,420 | 107.3 | 0.191 | 232.0 | 0.413 | 1,202 | 2.14 |
| BN plain | 0x27 | Fp12 squaring (12 → 12), final-exp powers | 8.2% | 192 | 332,572 | 66.9 | 0.201 | 144.9 | 0.436 | 741 | 2.23 |
| BN plain | 0x1e | Miller-loop step (10 → 12) | 4.3% | 92 | 360,582 | 68.4 | 0.190 | 150.8 | 0.418 | 767 | 2.13 |
| BN plain | 0x10 | G1 double-and-add step (vk_x MSM) | 3.6% | 508 | 54,802 | 8.9 | 0.162 | 24.1 | 0.439 | 114 | 2.07 |
| BN plain | 0x06 | Fp2 multiplication | 3.3% | 1,053 | 24,213 | 4.1 | 0.171 | 10.7 | 0.444 | 49 | 2.03 |
| BN plain | 0x0b / 0x0a | G2 point ops (B subgroup check) | 6.3% | 70 / 128 | 356,306 / 185,562 | 70.6 / 34.3 | 0.198 / 0.185 | 147.7 / 80.7 | 0.415 / 0.435 | 766 / 406 | 2.15 / 2.19 |
| BN plain | 0x12 | Fp inversion (Fermat) | 0.5% | 2 | 2,016,653 | 294.7 | 0.146 | 778.7 | 0.386 | 3,230 | 1.60 |
| BN opt | 0x18 | Fp12 × Fp12 | 39.7% | 356 | 900,704 | 184.0 | 0.204 | 388.1 | 0.431 | 1,998 | 2.22 |
| BN opt | 0x1d | Fp12 × sparse line | 25.8% | 352 | 587,150 | 111.3 | 0.190 | 247.0 | 0.421 | 1,256 | 2.14 |
| BN opt | 0x27 | Fp12 squaring | 8.2% | 191 | 344,078 | 68.0 | 0.198 | 149.5 | 0.434 | 764 | 2.22 |
| BN genpow | 0x27 | final-exp schedule step (12 → 12; 2,790 top-level calls) | 63.1% | 3,050 | 1,143,393 | 190.8 | 0.167 | 449.5 | 0.393 | 2,196 | 1.92 |
| BN genpow | 0x1d | Fp12 × Fp12 | 28.4% | 1,379 | 1,135,512 | 186.1 | 0.164 | 441.4 | 0.389 | 2,164 | 1.91 |
| BN genpow | 0x38 | Fp12 × sparse line | 2.8% | 264 | 580,801 | 101.8 | 0.175 | 236.6 | 0.407 | 1,165 | 2.01 |
| BLS plain | 0x10 | Fp12 × Fp12 | 41.3% | 301 | 1,385,756 | 170.8 | 0.123 | 419.6 | 0.303 | 2,388 | 1.72 |
| BLS plain | 0x15 | Fp12 × sparse line | 26.0% | 276 | 942,386 | 112.5 | 0.119 | 284.2 | 0.302 | 1,578 | 1.67 |
| BLS plain | 0x22 | Fp12 squaring, final-exp powers | 16.8% | 322 | 522,356 | 65.3 | 0.125 | 161.0 | 0.308 | 906 | 1.74 |
| BLS plain | 0x1a | Fp inversion (Fermat) | 1.2% | 2 | 6,072,050 | 609.3 | 0.100 | 1,680 | 0.277 | 6,961 | 1.15 |
| BLS opt | 0x10 | Fp12 × Fp12 | 35.6% | 257 | 1,405,149 | 179.1 | 0.127 | 437.3 | 0.311 | 2,447 | 1.74 |
| BLS opt | 0x15 | Fp12 × sparse line | 26.1% | 276 | 953,240 | 116.5 | 0.122 | 294.3 | 0.309 | 1,609 | 1.69 |
| BLS opt | 0x22 | Fp12 squaring | 16.7% | 321 | 525,989 | 67.0 | 0.127 | 163.5 | 0.311 | 919 | 1.75 |
| BLS genpow | 0x22 | final-exp schedule step (12 → 12; 4,314 top-level calls) | 53.6% | 4,570 | 3,003,654 | 699.5 | 0.233 | 1,748 | 0.582 | 8,498 | 2.83 |
| BLS genpow | 0x19 | Fp12 × Fp12 | 24.9% | 2,127 | 2,995,204 | 701.3 | 0.234 | 1,741 | 0.581 | 8,441 | 2.82 |
| BLS genpow | 0x7d / 0x7e | G2 point ops | 16.1% | 3,040 / 1,524 | 807,752 / 1,093,490 | 206.4 / 269.5 | 0.255 / 0.246 | 500.8 / 656.1 | 0.620 / 0.600 | 2,519 / 3,271 | 3.12 / 2.99 |

The genpow builds spend 2.2× (BLS) and 1.3× (BN) the op-cost of the cashc builds on one Fp12 multiplication, because they run many more small-operand instructions. BLS genpow also pays more per unit (0.234 against 0.123 ns per op-cost unit). The full per-function and per-sample tables (with control times) are in `kernels/results/summary.md`.

## Setup and repeatability

- **Machine:** AMD Ryzen 9 7900 (12C/24T, 2 CCDs), governor and EPP performance, boost on (not controllable without root), kernel 7.2.8.
- **BCHN rig:** stock BCHN v29.1.0 with the BCHN.md rig unchanged (`research/opcost-timing/bchn`): fresh regtest node per run, VM 2026 from genesis, script and signature caches at their minimum, `par=1`, node pinned to CPU 9 and driver to CPU 8.
  - **Blocks:** each workload is a block of K copies, with K = min(400, 4e8 / op-cost); the median control block has 400 copies. Each block gets 11 `validateblocktemplate` repetitions and one `submitblock`. Time is BCHN's `- Verify N txins` line divided by K.
  - **Runs:** two runs on two fresh nodes, `kern-a` and `kern-b`. In run A all 345 workloads gave the expected result. In run B, 346 of 347 did; the exception is `defcharge-gap`, rejected by BCHN while libauth accepts it, as explained above. Both nodes were stopped afterwards.
  - **Agreement between runs:** B/A per-transaction time has a median of 1.011, p5–p95 0.989–1.031, over 343 timed workloads. The singleton estimates agree within 0.1–1.4%.
  - **Anchors match the calibration run** (BCHN.md run 2) within 1–4%: BN sound-native 3,536 / 3,546 µs (run 2: 3,578), BLS 2,990 / 3,025 µs (3,032), trxhzt-like 73.5 / 74.7 µs (76.8).
  - **Spread across the 11 repetitions:** median 6.9%, p95 16.8%.
- **bchd-fork:** opcostbench with a new `-steady` mode (local branch `opcost-kernels` in `~/BCH-projects/bchd-fork-wt/opcost-kernels`, on top of `opcost-bench`; 2 local commits, not pushed).
  - **Steady mode:** no forced `runtime.GC()` per repetition. A warm-up, then 7 batches of ≥ 300 ms of evaluation (or of wall time); the value is the median of the batch means. GOGC is 400 as before, GOMAXPROCS=1, pinned to CPU 2.
  - **Singletons:** 1 warm-up and 3 evaluations, in the same mode.
  - **Repeatability:** two passes, the second in reverse order. Pass 2 / pass 1 has a median of 0.995 (p5–p95 0.957–1.024) for kernels over 50 µs.
- **libauth 3.1.0-next.8:** `kernels/libauth-steady.ts` (Node 24.22.1, CPU 4), with the same batch scheme.
  - **Why not FULL's driver:** FULL's `libauth-time.ts` calls `gc()` before every repetition. For evaluations of a few ms that makes libauth 2.7× slower than steady state. On the BN-opt 0x18 kernel: median 6.3 ms with forced GC, 2.1–2.3 ms without, 2.8–3.2 ms minimum. A 2 s singleton evaluation amortizes its own GC, so steady-state batches are the comparable number.
  - **bchd effect:** the same choice raises bchd's large-kernel times by about 20–25% compared with forced-GC repetitions, because GC is then charged as it is inside a long run.
  - **Repeatability:** two passes, pass 2 / pass 1 median 0.988, p5–p95 0.967–1.014.
- **Fresh singleton times vs FULL.md:** bchd steady 315 / 331 / 2,157 / 301 / 306 / 14,903 ms for BN plain, opt, genpow and BLS plain, opt, genpow. FULL.md has 297 / 310 / 1,987 / 276 / 284 / 14,283 ms, with forced GC before each single long evaluation and concurrent load. libauth steady: 1.62 / 1.69 / 10.33 / 1.61 / 1.67 / 73.8 s; FULL.md: 2.10 / 2.32 / 13.0 / 2.01 / 2.07 / 83.8 s.
- **Concurrency:**
  - BCHN run A overlapped bchd pass 1 (CPU 2, other CCD); BCHN run B overlapped libauth pass 1 (CPU 4). bchd and libauth pass 2 ran together on CPUs 2 and 4.
  - Load average was 1.1–3.4 throughout. The machine was shared with desktop processes and, early on, another task's Go test run.
- **Verdicts:** every evaluation's result was checked: 0 mismatches on bchd and libauth over 2 × 324 kernel units and 2 × 6 singletons. libauth op-cost was checked exactly per evaluation.

## Limits

- **The BCHN number is an extrapolation.** BCHN never ran a whole singleton. What is measured on BCHN is the 162 kernel calls that make up 95.3–98.6% of each singleton's op-cost (by class). The method's own accuracy is measured on bchd and libauth, with a kernel sum within +4.3% / −0.4% of the full run. A BCHN-specific effect that exists only in long single-input evaluations would not show. One example is memory growth over a 25 G op-cost run.
- **Interpreting the per-byte multiples.** BCHN's l0fhm3 rate is fast (libsecp256k1), so the multiples per budget unit are about 1.5× larger on BCHN than the bchd figures in FULL.md: 474 vs 281 for BN plain, 3,676 vs 2,365 for BN genpow, 24,601 vs 17,206 for BLS genpow.
- **Roles are inferred**, from arity and call structure, not from the sources. Function ids are the singletons' own.
- **Machine:** one machine, boost on.

## Files

Data under `/home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing/kernels/`:
- **Profiles and kernels:**
  - `profile/<singleton>.json`: call-tree profiles.
  - `cut/<tag>/`: `cut.json` (classes, sampled kernels, glue), `kernels.json` (BCHN rig source), `units.json` (bchd/libauth).
  - `all-kernels.json`, `all-units.json`, `all-units-rev.json`, `singleton-units.json`.
  - `defcharge.json`, `defcharge-units.json`.
- **Timings:**
  - `raw/bchn-kern-{a,b}/`: results.jsonl, run.log, env.txt. Node datadirs are `work/opcost-timing/bchn-kern-{a,b}`; both nodes are stopped.
  - `raw/{bchd,libauth}-{kern,single}-{1,2}.json` with logs and env files, and `raw/bchd-defcharge.json`.
- **Results:** `results/summary.{md,json}` (all runs combined), `results/pass{1,2}.*` (validation per pass), `results/bchn-{a,b}.*` (per BCHN run).
- **bchd binary:** `opcostbench`.

Scripts are on branch `wip/opcost-kernels` of zk-verifier-bench under `research/opcost-timing/kernels/`: profile-calls.ts, extract-kernels.ts, assemble.mjs, run-bchn.sh, libauth-steady.ts, estimate.ts, labels.json, check-bchd-opcost.mjs, make-defcharge.ts, wl2units.ts. The bchd driver change is in `research/opcost-timing/bchd-opcost-kernels.patch` (on top of `bchd-opcost-bench.patch`). Summaries, cut accounting and environment records are copied to `research/opcost-timing/kernels/data/`.

Reproduce from the zk-verifier-bench worktree root:
```sh
K=../opcost-timing/kernels; U=../opcost-timing/full/units.json; P=research/opcost-timing/kernels
npx tsx $P/profile-calls.ts $U bch-groth16-singleton:valid $K/profile/bch-groth16-singleton.json        # per singleton
npx tsx $P/extract-kernels.ts $U bch-groth16-singleton:valid $K/profile/bch-groth16-singleton.json $K/cut/bn-plain --tag bn-plain
node $P/assemble.mjs $K $U
EXTRA_SRC="--src json:$K/defcharge.json" $P/run-bchn.sh kern-b 9 8 11          # fresh node each run
GOMAXPROCS=1 taskset -c 2 $K/opcostbench -steady -in $K/all-units.json -out $K/raw/bchd-kern-1.json
GOMAXPROCS=1 taskset -c 2 $K/opcostbench -steady -batches 3 -batchtime 1ms -warmtime 1ms -in $K/singleton-units.json -out $K/raw/bchd-single-1.json
taskset -c 4 node --import tsx $P/libauth-steady.ts $K/all-units.json $K/raw/libauth-kern-1.json
taskset -c 4 node --import tsx $P/libauth-steady.ts $K/singleton-units.json $K/raw/libauth-single-1.json --batches 3 --batchtime 1 --warmtime 1
npx tsx $P/estimate.ts --cut $K/cut/bn-plain,... --bchn ... --bchd ... --libauth ... --full-bchd ... --full-libauth ... \
   --labels $P/labels.json --score bn-plain=8206 ... --out $K/results/summary.json > $K/results/summary.md
node $P/check-bchd-opcost.mjs $K $K/raw/bchd-kern-1.json
```
