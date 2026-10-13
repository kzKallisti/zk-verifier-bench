# Experimental current-rules VMLA verification work

We are studying how useful verifier contracts and adversarial validation work interact with BCH VM accounting. This extension measures the complete VMLA registration corpus under the pinned current-rule script modes at instruction base 100. It supplements the original annual-pack baseline and earlier selected-verifier experiments. Bases 50/20 remain experimental; these measurements do not select a replacement schedule.

On the shared Apple M4 Max, the largest median process-mean ns/byte among original registered script cases in each mode occurred in accepted 1-of-3 bare-multisig cases (`l0fhm3`), each 99,988 serialized spending bytes. These are finite cohort observations, not a global accepted-work ceiling. The modes were measured separately and are not paired controls.

| Mode / original registration | Cached VerifyScript ms | ns per spending byte |
|---|---:|---:|
| standard / 2025 `l0fhm3_S_S` | 67.469 (64.138–68.562) | 674.771 (641.459–685.703) |
| consensus / 2026 `l0fhm3_S_S` | 67.842 (64.795–68.656) | 678.500 (648.027–686.639) |

Values are median (minimum–maximum) of six process means. Each process mean averages three evaluations, each timing two complete all-input passes. All original inputs are attempted even after a script failure.

The following ratios describe those same cases, with each reference measured in the same process. Each cell is whole-spending-transaction time ratio / per-byte ratio, followed by its six-process range. Ratios are formed from process means before aggregation; they are not ratios of displayed medians.

| Mode / same case | Annual standard `trxhzt` | Current same-mode `trxhzt` | Current same-mode accepted bare |
|---|---:|---:|---:|
| standard | 1431.026 (1399.938–1455.382) / 5.238 (5.124–5.327) | 1424.446 (1394.321–1461.606) / 5.214 (5.104–5.350) | 1.002 (0.999–1.008) / 1.002 (0.999–1.008) |
| consensus | 1395.419 (1335.702–1482.901) / 5.108 (4.889–5.428) | 1406.233 (1391.425–1477.688) / 5.147 (5.093–5.409) | 1.000 (0.985–1.006) / 1.000 (0.985–1.006) |

Absolute reference ranges below span all 18 evaluation averages, not the six process means above. The annual reference uses the case's original pack year and **standard** flags even in the consensus campaign. Current references always use current rules, regardless of a case's source year. The bare references are distinct registrations from the representative cases, so their measured ratios need not equal 1.

| Campaign | Reference | Spending bytes | Flags | Cached ms range | ns/byte range |
|---|---|---:|---:|---:|---:|
| standard | annual 2025 standard trxhzt | 366 | 267470831 | 0.043667–0.050438 | 119.309–137.807 |
| standard | current-trxhzt | 366 | 535906287 | 0.043333–0.049854 | 118.396–136.213 |
| standard | current-bare | 99988 | 535906287 | 63.753084–68.751688 | 637.607–687.599 |
| consensus | annual 2026 standard trxhzt | 366 | 535906287 | 0.043521–0.055146 | 118.910–150.671 |
| consensus | current-trxhzt | 366 | 396445551 | 0.043687–0.049459 | 119.365–135.133 |
| consensus | current-bare | 99988 | 396445551 | 65.489312–69.151750 | 654.972–691.600 |

## Method and limits

Each mode used six sequential native processes, each with three evaluations × two cached passes per registration, with six pack/order permutations. Standard retained 3,254 originals plus two annual references; consensus retained 3,254 plus three. All 117,234 output rows remain: 114,534 script samples, including rejections, and 2,700 repeated policy-rejection receipts with null script timing. The 150 distinct standard policy-rejected registrations were not timed as zero work. No samples or outliers were discarded.

The steady-clock boundary encloses real-checker cached all-input `VerifyScript`, including failed-script execution. Untimed complete pre/post outcome vectors verify every input; decode, policy, cache/context/precompute, control checks and output stay outside the timer. Setup components overlap their containing cache totals and must not be added twice; process-global corpus reads are counted once. Per-process wall times were 54.050–56.055 seconds for standard and 78.238–81.686 seconds for consensus; these include setup, controls and output and are not verification times.

Current script flags are standard 535906287 and consensus 396445551. Annual references retain pack-standard flags (2023: 66144239; 2025: 267470831; 2026: 535906287). The M4 build/runtime and loaded-image evidence are pinned; nice15 and readiness checks do not establish CPU isolation or constant clocks. The original 4.3× pilot compared different limited workloads and boundaries; it is not comparable to these ratios or an established BCH ceiling.

This is script-cohort evidence, not full transaction/value/fee/token/finality, mempool, block or network validation. No VM-attributable memory, global worst case, lower-cost safety or optimality claim follows. Recent conditional BLS source bounds do not change challenge scores. Broader adversarial, memory, hardware and whole-block work remains open.

Original research and implementation: **GPT-6 Astra**, directed by Kallisti. This full-cohort timing analysis and publication draft: **GPT-6.1 Sol**, directed by Kallisti.

Publication condition: publish the portable data/parser/source mapping described in the preparation plan before presenting this draft as publicly reproducible. The current private paths and hash receipts alone do not provide public access; no relocated wrapper or clean-install native build is claimed validated.
