# opcost-timing / FULL: bchd-fork + libauth, all workloads

Task: opcost-full (Track 1, "what does op-cost cost in real CPU time?"). Engines: bchd-fork (Go, `txscript`, the 2026 VM incl. OP_DEFINE/OP_INVOKE, loops, vmlimits) and libauth 3.1.0-next.8 (the bench harness VM). BCHN is covered separately (BCHN.md, opcost-bchn).

> **Status (opcost-finalize, 2026-10-27).** Read REPORT.md for the synthesis. Three caveats from review apply to this
> file: (1) the "x l0fhm3 per budget unit" multiples below divide by the *bare-locking* budget (the singleton script sits
> in the spent output's locking bytecode, which is non-standard over 201 B and which the VM-limits CHIP leaves out of the
> budget on purpose). Under a P2SH32 deployment the multiples are about 20× smaller (REPORT.md, `report-multiples.md`).
> (2) The libauth absolute times here ran under contention (CPU 10 shared the CCD's L3 with BCHN and bchd) and with
> forced GC per repetition: a quiet re-run gave 20–33% lower times (sound-native 67.8 vs 86 ms, l0fhm3 4,771 vs
> 6,077 ms) with the same ratios. Use libauth figures as ratios, or ±30%. (3) bchd and libauth here use forced GC per
> repetition; KERNELS.md uses steady state. For bchd this moves sound-native from 7.6 to 9.0 ms (l0fhm3 unchanged),
> about 17% on the verifier/l0fhm3 ratio. Headline multiples come from BCHN only (KERNELS.md, BCHN.md).

## Answer

**The excess op-cost of the byte-floor singletons is real validation work, not an accounting artefact.** On both engines the time per op-cost unit of every verifier sits in the same narrow band as the VM-limits arithmetic benchmarks (bchd 0.28 to 0.60 ns per op-cost unit; the arithmetic worst cases 0.6 to 0.9; signature checking 2.4 to 7.7). Op-cost over-charges our bignum workloads relative to the signature-checking worst cases by about 13x in bchd (and 8-14x on BCHN, BCHN.md), so a verifier that needs 2,838 to 130,130 times its bare-locking budget in op-cost needs roughly a tenth of that multiple in CPU time; the rest of the overrun is real CPU work:

- BN genpow (268 B tx, 5.52 G op-cost): **1.99 s** in bchd, **13.0 s** in libauth. Its BCH 2026 budget is 199,200 op-cost units; per budget unit it costs 9,974 ns in bchd, **2,365 times** the worst VM-limits vector (l0fhm3, packed 1-of-3 ECDSA bare multisig, 4.22 ns per budget unit).
- BLS genpow (265 B, 25.6 G op-cost): **14.3 s** bchd, **84 s** libauth; 17,200 times the worst case per budget unit.
- Plain and opcode-optimized singletons (BN 0.77 to 0.80 G, BLS 0.99 to 1.00 G op-cost): 0.28 to 0.31 s bchd, 2.0 to 2.3 s libauth; 187 to 294 times the worst case per budget unit.
- The sound-native chains (BCH 2026 consensus-valid, 3 and 4 inputs) and the bch-spec SI-GLS singles: 7 to 9 ms bchd (86 to 111 ms libauth), 0.26 to 0.36 ns per budget unit, i.e. **12 to 16 times below** the worst VM-limits vector in bchd and 17 to 25 times below libauth's worst. They fit the budget in op-cost and in time.

So the byte-tied budget is doing what it was calibrated to do: if such spends were admitted (they are consensus-invalid today), the singletons would make a block validator spend roughly 190 to 17,000 times more CPU per budget unit (bare-locking basis; about 20x less per P2SH32 budget unit, see the status note) than the worst case the 2025/2026 limits were designed around (RelCostPerByte against the baseline trxhzt: BN genpow 13,800 and BLS genpow 100,600 in bchd, against 6.3 for l0fhm3; the CHIP reports about 5 for l0fhm3 on BCHN).

Where op-cost is least accurate (opcode-class profile below):
- **Small-operand arithmetic is under-priced relative to OP_MUL/OP_MOD on big operands.** In bchd, add/sub/compare cost 1.25 to 1.9 ns per op-cost unit against 0.22 to 0.57 for mul/div/mod; in our verifiers add/sub/cmp is about 21 to 28% of the time for 3 to 9% of the op-cost. It is still well under signature checking (about 4.9 ns per op-cost unit in l0fhm3), so it does not threaten the calibration.
- **BLS genpow is the most expensive per op-cost unit** (bchd 0.56 vs 0.28 for the other BLS builds): its 13 M OP_MULs are on small operands (600 op-cost each on average) and pay about 545 ns each, the fixed big.Int and number-encoding cost per arithmetic instruction (about 300 ns).
- libauth is about 6 to 13 times slower than bchd on our workloads (7x on the singletons, 11 to 14x on the multi-input and bch-spec builds, where per-evaluation parsing of 9 to 26 kB redeem scripts, OP_INVOKE overhead and GC show). In this contended pass libauth's worst case per budget unit was a 1-byte OP_DIV/OP_MOD vector (ly54y8, 85 ns per budget unit), followed by l0fhm3 (76); a quiet re-run reverses the order (l0fhm3 about 59, ly54y8 about 57).

## Finding: OP_DEFINE op-cost differs between libauth and bchd/BCHN

bchd charges the pushed function body of every OP_DEFINE as pushed bytes (100 + body length), following BCHN's metrics (bchd commit ecc1b0ff, "the original specification repository OpCost value did not account for the function inside OP_DEFINE"; libauth's generated chip.functions / chip.flow-control limits differ accordingly). libauth 3.1.0-next.8, which the harness uses, charges 100. For **every** verifier the bchd op-cost equals the libauth op-cost plus exactly the executed OP_DEFINE body bytes (checked per workload from the bchd profile): +1,077 (BN SI-GLS), +2,221 (BLS SI-GLS), +43,554 (BN sound-native, 3 inputs), +51,304 (BLS sound-native, 4 inputs), +2.5k to +4.4k for the singletons. **All sound inputs still fit their budgets** under the bchd/BCHN rule: BN sound-native inputs 7,016,645 / 6,975,846 / 6,623,944 against 7,485,600 / 7,442,400 / 7,066,400; BLS sound-native 4,659,255 / 6,840,366 / 6,832,085 / 5,759,884 against 5,150,400 / 7,836,800 / 7,808,800 / 6,452,800; the SI-GLS singles 23,338,058 and 26,073,214 against the bch-spec 25,453,600 and 29,108,800. bchd accepts both sound-native chains under BCH 2026 consensus limits and both SI-GLS builds under bch-spec limits. Reported op-cost and budget margins in results.json come from libauth and are therefore 0.01 to 0.2% low for OP_DEFINE-heavy entries: under bchd/BCHN accounting the BN sound-native margins are 468,955 / 466,554 / 442,456 (14,518 less per input than libauth's) and the BLS sound-native margins 491,145 / 996,434 / 976,715 / 692,916 (about 12,800 less per input). The BCHN run (BCHN.md) should confirm against the real node.

## Method

- **Workloads.** `research/opcost-timing/export-workloads.ts` loads each REGISTRY entry and captures, through `harness/vm.ts evaluatePair`, the exact transaction and source outputs the benchmark grades (multi-input entries keep their real siblings): BN and BLS plain, opcode-optimized, genpow and minop singletons; both bch-spec SI-GLS builds; both sound-native chains. For each, the primary valid proof and the first invalid proof. `make-units.ts` adds every VM-limits benchmark vector: libauth `src/lib/vmb-tests/generated/bch_2026_{standard,nonstandard}/*benchmarks*.vmb_tests.json` (291 transactions; libauth `next` 0534f9bb, byte-identical to bchd-fork's copies; these are the bch-vm-limits "tests-and-benchmarks" vectors, incl. baseline trxhzt and the CHIP's worst cases l0fhm3, lcennk/ta05ww, 09macl, u83yzg).
- **Modes.** `bch2026`: consensus limits, block (non-standard) flags. `bchspec`: density base 10,000, 100 kB scripts, stack items and numbers. `loose`: every resource limit lifted (op-cost and hash budgets, sizes, depths); used for the singletons (all exceed the op-cost budget; minop also the 10 kB script cap).
- **bchd-fork driver** (`cmd/opcostbench`, branch opcost-bench in ~/BCH-projects/bchd-fork-wt/opcost-bench, local commits only, patch in `research/opcost-timing/bchd-opcost-bench.patch`). The VM limits that were constants became one benchmark-only `BenchLimits` value (defaults equal the constants; `go test ./txscript -run TestMay2026` passes). Per repetition: setup = tx and utxo decode, sighash midstate, `NewEngine` per input; eval = `Execute()` per input. `GOMAXPROCS=1`, GC before each repetition.
- **libauth driver** (`libauth-time.ts`): setup = decode tx and outputs; eval = `vm.evaluate` + `stateSuccess` per input; `gc()` before each repetition.
- **Verification.** Every repetition's transaction verdict is checked (valid proofs accept, invalid proofs reject; all VM-limits vectors accept), and the primary-input op-cost of every vector is checked exactly against its `nonstandard_limits.json` on both engines. Verifier op-costs: libauth checked exactly against the harness export; bchd checked as libauth + OP_DEFINE bodies (above). 0 mismatches in 4 timing passes and 2 profile passes.
- **Repetitions.** Adaptive: at least 5 (pass 1, 2 s minimum per unit) or 3 (libauth pass 2, 1 s), up to 2,000. Two full passes per engine. Reported: median of the per-pass medians, spread = fastest and slowest single repetition over both passes relative to that median. Pass 2 vs pass 1 medians: bchd verifiers -4.4..+5.0% (median +0.2%), bchd vectors -12.6..+3.2%; libauth verifiers -5.1..+32.6% (median -0.1%), libauth vectors -30..+100% on sub-millisecond vectors (JIT/GC), so libauth figures for tiny vectors are indicative only.
- **Profiles.** bchd: `Engine.ExecuteProfiled` times each `Step` (opcode + accounting + limit checks) and records its op-cost delta; the empty-span timer cost (20 ns) is subtracted per instruction. libauth: each operation is wrapped (exclusive time, nested evaluation subtracted); op-cost, which libauth adds in the per-instruction `every` hook, is attributed to the opcode just executed, the hook's time is the "VM loop/accounting" class; timer cost (40 ns) subtracted. Profiled runs are slower than timed runs; use the shares, not absolute times.
- **Machine.** AMD Ryzen 9 7900 (12C/24T, 2 CCDs), governor performance, EPP performance, boost on (not controllable without root), kernel 7.2.8, Go 1.27.1, Node 24.22.1. bchd pinned to CPU 2, libauth to CPU 10 (libauth profile to CPU 4). The two engines' passes partly overlapped on different cores, and the concurrent opcost-bchn task ran a pinned bitcoind (CPU 9) and node (CPU 5); slow-side spreads up to +76% on a few multi-input units come from that, medians are stable to about 5% between passes.

## Verifier workloads (valid proofs; invalid proofs in results/summary.md)

Op-cost: bchd composite non-standard op-cost summed over inputs. Budget: the op-cost the transaction is granted on its VM ((41 + unlocking) x 800 per input on BCH 2026, (10,000 + unlocking) x 800 on bch-spec); for loose rows it is the BCH 2026 budget. "x l0fhm3": bchd ns per budget unit divided by that of the worst VM-limits vector (4.218).

| workload | VM | tx B | in | op-cost (bchd) | budget | x budget | bchd ms (spread) | bchd ns/op-cost | libauth ms (spread) | libauth ns/op-cost | bchd ns/budget unit | x l0fhm3 | libauth ns/budget unit |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| singleton | loose | 334 | 1 | 771,304,255 | 250,400 | 3,080.3 | 297.0 (-5/+12%) | 0.385 | 2,095 (-5/+4%) | 2.72 | 1,185.97 | 281.2 | 8,368.4 |
| singleton-opcode-optimized | loose | 334 | 1 | 800,158,630 | 250,400 | 3,195.5 | 310.0 (-4/+23%) | 0.387 | 2,324 (-4/+14%) | 2.90 | 1,238.17 | 293.5 | 9,280.6 |
| singleton-genpow | loose | 268 | 1 | 5,519,655,221 | 199,200 | 27,709.1 | 1,986.9 (-1/+1%) | 0.360 | 13,021 (-2/+9%) | 2.36 | 9,974.34 | 2,364.7 | 65,367.5 |
| singleton-minop | loose | 7,509 | 1 | 64,844,252 | 5,990,400 | 10.8 | 39.0 (-17/+6%) | 0.601 | 286 (-4/+16%) | 4.41 | 6.51 | 1.5 | 47.8 |
| bls12381-singleton | loose | 459 | 1 | 994,592,972 | 350,400 | 2,838.5 | 276.2 (-5/+3%) | 0.278 | 2,006 (-2/+3%) | 2.02 | 788.30 | 186.9 | 5,726.2 |
| bls12381-singleton-opcode-optimized | loose | 459 | 1 | 1,003,515,113 | 350,400 | 2,863.9 | 283.7 (-3/+2%) | 0.283 | 2,069 (-2/+4%) | 2.06 | 809.68 | 192.0 | 5,905.3 |
| bls12381-singleton-genpow | loose | 265 | 1 | 25,609,645,438 | 196,800 | 130,130.3 | 14,282.9 (-3/+9%) | 0.558 | 83,766 (-2/+1%) | 3.27 | 72,575.60 | 17,206.2 | 425,641.8 |
| bls12381-singleton-minop | loose | 809 | 1 | 145,599,283 | 630,400 | 231.0 | 59.2 (-8/+63%) | 0.407 | 450 (-3/+12%) | 3.09 | 93.89 | 22.3 | 713.2 |
| sound-si-gls-single | bchspec | 21,880 | 1 | 23,338,058 | 25,453,600 | 0.9 | 9.1 (-2/+14%) | 0.390 | 111 (-8/+33%) | 4.76 | 0.36 | 0.1 | 4.4 |
| bls12381-sound-si-gls-single | bchspec | 26,449 | 1 | 26,073,214 | 29,108,800 | 0.9 | 7.7 (-1/+36%) | 0.296 | 104 (-14/+27%) | 3.98 | 0.27 | 0.1 | 3.6 |
| bn254-sound-native | bch2026 | 27,519 | 3 | 20,616,435 | 21,994,400 | 0.9 | 7.7 (-3/+45%) | 0.373 | 86 (-15/+17%) | 4.16 | 0.35 | 0.1 | 3.9 |
| bls12381-sound-native | bch2026 | 34,089 | 4 | 24,091,590 | 27,248,800 | 0.9 | 7.2 (-4/+76%) | 0.297 | 92 (-21/+22%) | 3.83 | 0.26 | 0.1 | 3.4 |


Setup (decode + sighash + engine construction) is 21 to 125 µs in bchd for every workload, under 0.5% of evaluation except for the smallest vectors.

## VM-limits worst cases (references)

| id | what | tx B | op-cost | budget used | bchd ms | bchd ns/op-cost | bchd ns/budget unit | libauth ms | libauth ns/op-cost | libauth ns/budget unit | bchd RelCost/B |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| l0fhm3 | standard/signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337.328 | 4.822 | 4.218 | 6,076.947 | 86.88 | 75.99 | 6.30 |
| vzvufa | standard/signature-checking.bms-ecdsa | 99,989 | 69,279,106 | 87% | 168.543 | 2.433 | 2.107 | 2,010.412 | 29.02 | 25.14 | 3.15 |
| t0z6jt | standard/signature-checking.p2pk | 99,960 | 24,955,546 | 31% | 191.455 | 7.672 | 2.395 | 1,415.986 | 56.74 | 17.71 | 3.57 |
| d5rw9l | standard/signature-checking.bms-schnorr | 99,922 | 25,300,600 | 32% | 190.258 | 7.520 | 2.381 | 2,195.048 | 86.76 | 27.47 | 3.55 |
| 99mssa | standard/signature-checking.p2pkh | 99,991 | 19,325,213 | 24% | 121.274 | 6.275 | 1.516 | 679.550 | 35.16 | 8.50 | 2.26 |
| lcennk | nonstandard/hashing-iters.packed | 99,966 | 65,884,052 | 82% | 14.323 | 0.217 | 0.179 | 199.860 | 3.03 | 2.50 | 0.27 |
| ta05ww | nonstandard/hashing-iters.packed | 99,966 | 63,691,756 | 80% | 12.524 | 0.197 | 0.157 | 176.977 | 2.78 | 2.21 | 0.23 |
| 09macl | standard/arithmetic.add-sub | 183 | 129,226 | 99% | 0.110 | 0.853 | 0.846 | 5.199 | 40.23 | 39.87 | 1.12 |
| u83yzg | standard/arithmetic.div-mod | 73 | 41,208 | 97% | 0.025 | 0.596 | 0.579 | 0.348 | 8.46 | 8.22 | 0.63 |
| gwvyrp | standard/arithmetic.mul | 72 | 41,340 | 99% | 0.035 | 0.857 | 0.852 | 2.482 | 60.03 | 59.65 | 0.92 |
| ly54y8 | standard/arithmetic.div-mod | 72 | 41,343 | 99% | 0.034 | 0.827 | 0.822 | 3.529 | 85.36 | 84.83 | 0.89 |
| 2xhecr | standard/arithmetic.add-sub | 85 | 51,214 | 98% | 0.032 | 0.627 | 0.617 | 3.937 | 76.87 | 75.71 | 0.70 |
| 8qnlgt | standard/chip.bitwise | 211 | 34,010 | 23% | 0.122 | 3.595 | 0.840 | 1.511 | 44.42 | 10.38 | 1.08 |
| trxhzt | standard/baseline | 366 | 54,520 | 24% | 0.196 | 3.598 | 0.851 | 0.352 | 6.45 | 1.53 | 1.00 |

The worst cases by time per budget unit are all signature checking (bchd: l0fhm3 4.22, xuxr6e 3.29, t0z6jt 2.39 ns per budget unit); the arithmetic and hashing vectors stay at or below 0.85 ns per budget unit in bchd. The full per-group table and the top-12 lists are in results/summary.md.

## Opcode-class profile

Cells: share of time / share of op-cost (percent). Classes: mul/div/mod (OP_MUL/DIV/MOD), add/sub/cmp/shift (other numeric opcodes), hashing, sigcheck, push, stack (TOALTSTACK..TUCK), bytes/serialization (CAT..EQUALVERIFY, REVERSEBYTES, NUM2BIN/BIN2NUM, bitwise), control (flow, VERIFY, DEFINE/INVOKE, NOPs). Introspection is 0 to 1% everywhere and omitted. Right columns: profiled ns per op-cost unit of the class.

bchd
| workload | mul/div/mod | add/sub/cmp/shift | hashing | sigcheck | push | stack | bytes/serialization | control | ns/op-cost mul/div/mod | ns/op-cost add/sub/cmp | ns/op-cost stack+push+bytes |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| BN plain | 57/56 | 21/5 | - | - | 7/19 | 8/11 | - | 7/9 | 0.35 | 1.33 | 0.17 |
| BN opcode-opt | 56/54 | 20/5 | - | - | 7/19 | 9/12 | - | 8/9 | 0.36 | 1.35 | 0.19 |
| BN genpow | 65/61 | 12/3 | - | - | 7/17 | 8/10 | - | 8/9 | 0.37 | 1.46 | 0.18 |
| BN minop | 43/47 | 41/15 | - | - | 4/15 | 11/23 | 0/0 | 1/1 | 0.48 | 1.50 | 0.22 |
| BLS plain | 57/70 | 24/4 | - | - | 6/12 | 8/9 | - | 6/5 | 0.22 | 1.53 | 0.17 |
| BLS opcode-opt | 56/69 | 23/4 | - | - | 6/12 | 8/9 | - | 6/6 | 0.22 | 1.56 | 0.19 |
| BLS genpow | 69/68 | 23/9 | - | - | 2/7 | 4/12 | - | 2/4 | 0.57 | 1.52 | 0.16 |
| BLS minop | 45/60 | 40/9 | - | - | 3/12 | 10/17 | 0/0 | 2/2 | 0.32 | 1.93 | 0.19 |
| BN SI-GLS spec | 58/61 | 24/7 | 0/0 | - | 5/10 | 11/19 | 2/2 | 1/1 | 0.36 | 1.29 | 0.21 |
| BLS SI-GLS spec | 56/71 | 28/6 | 0/0 | - | 4/7 | 9/13 | 2/2 | 1/1 | 0.23 | 1.38 | 0.19 |
| BN sound-native | 57/58 | 21/6 | 0/0 | - | 5/11 | 11/18 | 3/4 | 2/2 | 0.34 | 1.25 | 0.20 |
| BLS sound-native | 52/67 | 28/6 | 0/0 | - | 4/8 | 9/13 | 4/4 | 2/1 | 0.22 | 1.33 | 0.19 |
| l0fhm3 1-of-3 ECDSA bms | - | - | - | 100/99 | 0/1 | - | - | - | - | - | 0.43 |
| t0z6jt P2PK Schnorr | - | - | - | 100/99 | 0/1 | - | - | - | - | - | 0.32 |
| lcennk hashing | - | - | 82/40 | - | 1/0 | 3/27 | 14/32 | - | - | - | 0.06 |
| 09macl OP_ADD | - | 97/65 | 1/0 | - | 0/0 | 1/33 | 1/1 | - | - | 1.32 | 0.07 |
| u83yzg OP_MOD | 66/49 | - | 1/1 | - | 2/1 | - | 31/49 | - | 0.85 | - | 0.40 |
| 2xhecr OP_SUB | - | 74/39 | 1/1 | - | 1/1 | 0/20 | 24/40 | - | - | 1.23 | 0.27 |
| ly54y8 OP_DIV/MOD 1B | 77/59 | - | 2/1 | - | 1/1 | - | 20/40 | - | 1.17 | - | 0.46 |
| trxhzt baseline | - | - | 1/1 | 99/97 | 0/2 | 0/0 | 0/0 | - | - | - | 0.88 |

libauth
| workload | mul/div/mod | add/sub/cmp/shift | hashing | sigcheck | push | stack | bytes/serialization | control | VM loop/accounting | ns/op-cost mul/div/mod | ns/op-cost add/sub/cmp | ns/op-cost stack+push+bytes |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| BN plain | 38/56 | 26/5 | - | - | 2/19 | 9/11 | - | 21/9 | 4/0 | 1.93 | 13.39 | 1.08 |
| BN opcode-opt | 38/54 | 25/5 | - | - | 3/19 | 10/12 | - | 22/9 | 2/0 | 1.79 | 12.17 | 1.04 |
| BN genpow | 45/61 | 15/3 | - | - | 3/17 | 10/10 | - | 23/9 | 4/0 | 1.75 | 12.77 | 1.18 |
| BN minop | 28/47 | 50/15 | - | - | 3/15 | 14/23 | 0/0 | 4/1 | 2/0 | 2.48 | 14.47 | 1.84 |
| BLS plain | 41/70 | 27/4 | - | - | 3/12 | 10/9 | - | 17/5 | 3/0 | 1.15 | 13.04 | 1.18 |
| BLS opcode-opt | 40/69 | 28/4 | - | - | 3/12 | 9/9 | - | 17/6 | 3/0 | 1.14 | 13.50 | 1.13 |
| BLS genpow | 52/68 | 31/9 | - | - | 1/7 | 6/12 | - | 7/4 | 3/0 | 2.45 | 11.32 | 1.21 |
| BLS minop | 30/60 | 45/9 | - | - | 2/12 | 14/17 | 0/0 | 6/2 | 3/0 | 1.44 | 14.46 | 1.67 |
| BN SI-GLS spec | 27/61 | 23/7 | 1/0 | - | 2/10 | 12/19 | 3/2 | 10/1 | 22/0 | 2.61 | 19.70 | 3.18 |
| BLS SI-GLS spec | 33/71 | 23/6 | 2/0 | - | 3/7 | 12/13 | 5/2 | 8/1 | 15/0 | 1.70 | 14.55 | 3.28 |
| BN sound-native | 41/58 | 27/6 | 0/0 | - | 5/11 | 14/18 | 4/4 | 5/1 | 3/0 | 2.93 | 18.79 | 2.96 |
| BLS sound-native | 29/67 | 27/6 | 0/0 | - | 2/8 | 20/13 | 4/4 | 6/1 | 12/0 | 1.44 | 14.78 | 3.52 |
| l0fhm3 1-of-3 ECDSA bms | - | - | - | 100/99 | 0/1 | - | - | - | 0/0 | - | - | 2.61 |
| t0z6jt P2PK Schnorr | - | - | - | 100/99 | 0/1 | - | - | - | 0/0 | - | - | 5.08 |
| lcennk hashing | - | - | 80/40 | - | 0/0 | 7/27 | 10/32 | - | 2/0 | - | - | 0.88 |
| 09macl OP_ADD | - | 92/65 | 0/0 | - | 0/0 | 1/33 | 6/1 | - | 1/0 | - | 63.73 | 9.45 |
| u83yzg OP_MOD | 76/49 | - | 4/1 | - | 2/1 | - | 16/49 | - | 2/0 | 11.89 | - | 2.68 |
| 2xhecr OP_SUB | - | 93/39 | 0/1 | - | 0/1 | 0/20 | 6/40 | - | 0/0 | - | 263.14 | 11.67 |
| ly54y8 OP_DIV/MOD 1B | 97/59 | - | 1/1 | - | 0/1 | - | 2/40 | - | 0/0 | 116.59 | - | 2.96 |
| trxhzt baseline | - | - | 4/1 | 93/97 | 1/2 | 0/0 | 1/0 | - | 1/0 | - | - | 14.36 |


Reading: in bchd every verifier spends 52 to 69% of its time in OP_MUL/OP_DIV/OP_MOD for 47 to 71% of its op-cost, i.e. op-cost tracks the dominant work closely; add/sub/compare is the under-priced class (about 4x the time share of its op-cost share), stack/push/bytes are over-priced (0.16 to 0.22 ns per op-cost unit). The calibration worst cases are 99 to 100% signature checking (l0fhm3, t0z6jt, baseline) or hashing plus serialization (lcennk, ta05ww), classes our verifiers barely use. In libauth the same picture holds with a heavier control class (17 to 23% on the singletons: OP_INVOKE re-decodes the function body on each call) and add/sub/cmp at 11 to 20 ns per op-cost unit.

## Files

- Raw data: /home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing/full/ (workloads.json, units.json, results/bchd-time-{1,2}.json, bchd-profile.json, libauth-time-{1,2}.json, libauth-profile.json, logs, env.txt, summary.md, summary.json, main-tables.md, class-tables.md; upstream/ = read-only clones of libauth next and bch-vm-limits).
- Scripts (branch wip/opcost-full, research/opcost-timing/): export-workloads.ts, make-units.ts, libauth-time.ts, libauth-trace.ts, analyze.mjs, bchd-opcost-bench.patch (against bchd-fork master 565d08c9).
- bchd driver binary: full/opcostbench (built from ~/BCH-projects/bchd-fork-wt/opcost-bench, branch opcost-bench).

Reproduce (from the full-bench worktree):
```
tsx research/opcost-timing/export-workloads.ts ../full/workloads.json
tsx research/opcost-timing/make-units.ts ../full/workloads.json <libauth>/src/lib/vmb-tests/generated ../full/units.json
GOMAXPROCS=1 taskset -c 2 ./opcostbench -in units.json -out results/bchd-time-1.json -mintime 2s -minreps 5
GOMAXPROCS=1 taskset -c 2 ./opcostbench -in units.json -out results/bchd-profile.json -profile -nocostcheck
taskset -c 10 node --expose-gc --import tsx research/opcost-timing/libauth-time.ts ../full/units.json ../full/results/libauth-time-1.json [--profile]
node research/opcost-timing/analyze.mjs ../full
```
