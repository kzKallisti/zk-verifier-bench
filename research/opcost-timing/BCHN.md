# BCHN calibration: what one unit of op-cost costs on Bitcoin Cash Node

Task: opcost-bchn (Track 1). Date: 2026-10-27. Engine: stock BCHN v29.1.0 (`b31ed10b4`), binaries at
`~/BCH-infra/bitcoin-cash-node-29.1.0/bin`, unmodified. Machine: AMD Ryzen 9 7900 (Zen 4, 12C/24T), Linux 7.2.8,
amd-pstate-epp, governor `performance`, EPP `performance`, boost on. Node pinned with `taskset -c 9`. The driver ran on CPU 5. A sibling bchd benchmark was pinned to CPU 8
during the runs, with load average 1.5 to 5.3. Its effect was small: the per-run spread is in the tables, and the
median for each workload moved by 2% between two independent runs.

Raw data: `raw/bchn-run1/` and `raw/bchn-run2/` hold `env.txt`, `results.jsonl` (everything the rig recorded),
`summary.md`, `summary.csv` and `run.log`. **Run 2 is the reference run.** It has all 312 workloads, and 310 were timed
and accepted. The other 2 were the expected rejections. Run 1 predates re-signing, so its 19 signature-bearing VMB
vectors were rejected (`blk-bad-inputs`) as expected for relocated signatures. For the 291 workloads timed in both
runs, the run 2 / run 1 time ratio has a median of 1.022, with p5 0.959 and p95 1.066.

> **Status (opcost-finalize, 2026-10-27).** The measurements here stand and were reproduced within ±4% on two fresh
> nodes (REVIEW-1/2, `raw/bchn-rev3`). The singleton extrapolation in "Reading" item 3 is superseded by KERNELS.md
> (measured kernels; BLS genpow 6.06 s, not 3.1–4.6 s). REPORT.md is the synthesis and states every multiple with its
> budget base. The "op-cost / budget" column uses libauth op-cost, which is 0.2% below BCHN's for these chains
> (OP_DEFINE bodies, KERNELS.md).

## Method

- **Node.** Regtest with a fresh datadir `work/opcost-timing/bchn-<name>`. Ports are derived from the name. Settings:
  `upgrade12activationheight=0` (May 2026 VM active from genesis), `acceptnonstdtxn=1`, `maxscriptcachesize=0`,
  `maxsigcachesize=0` (BCHN logs "able to store 2 elements" for each), `par=1` (log: "Script verification uses 0
  additional threads"), `debug=bench`, `listen=0`, `connect=0`, `disablewallet=1`. The rig never touches
  `~/BCH-infra/regtest`.
- **Blocks are built by the rig.** There is no wallet and no mempool. Coinbases pay to bare `OP_1`, so funding needs no
  signatures. Blocks use BIP34 heights and CTOR ordering, and the rig grinds them against the regtest target.
- **Each workload** is a transaction template: its source outputs plus its tx. The rig runs these steps:
  1. It funds K copies of the source outputs (fresh outpoints) in a funding block.
  2. It builds one block with K copies of the workload tx. K is chosen so that about 2e8 op-cost lands in each block,
     capped at 2000 copies and 8 MB.
  3. It calls `validateblocktemplate` on that block 11 times. This runs TestBlockValidity, then ConnectBlock with full
     script checks and no state change. After each call the rig parses BCHN's own bench line
     `- Verify N txins: X ms` (N = K × inputs; the coinbase is not counted).
  4. It calls `submitblock` once (timed too) and checks the tip moved (accept) or reads the reject reason.
- **No cache can serve these runs.** Every workload tx is new, the caches hold at most 2 entries, and ConnectBlock does
  not store results in the cache. The repeated runs on the same block agree with each other and with the final
  `submitblock` Verify time. For example, BN valid: 11 runs gave a median of 35.78 ms (min 35.44, max 36.65), and
  submitblock gave 35.72 ms.
- **What is timed.** "Verify" is BCHN's script-validation phase: the loop over transactions (coin lookup, input checks,
  sighash precompute) plus all script evaluation. It excludes deserialization, merkle and sanity checks ("Sanity
  checks", recorded separately) and UTXO flush. The per-input overhead with no script work is
  `base-op1` = 1.0 µs per input/tx.
- **Op-cost** is computed by libauth 3.1.0-next.8 `createVirtualMachineBch2026(false)` on the exact bytes submitted. It
  is summed over every input of the tx. Every row's accept/reject result was checked against both libauth and BCHN
  (`asExpected`). The libauth op-cost of the tested input was compared with the op-cost published in the VMB `*_stats.csv`
  for 291 vectors. 286 match exactly. The other 5 are re-signed vectors and differ by ±1, because DER signature
  length varies.
- **VM-limits vectors.** All `*benchmarks*` files from `bitauth/vmb_tests` at `08133da` (2025-09-05),
  `bch_2026_standard` and `bch_2026_nonstandard`: 293 vectors, none of which use CashTokens. Signatures commit to
  outpoints, and the outpoints are fake, so signature-bearing inputs are re-keyed. Each original public key P maps to
  rig key sha256(tag‖P). The locking script is rebuilt with that key, and the input is re-signed with the same
  algorithm (ECDSA/Schnorr), the same sighash type and the same multisig slot. The legacy-mode slot is found by
  verifying each original signature against the original keys. The opcodes, signature kinds and number of
  verifications do not change. This applies to 19 vectors, including the `trxhzt` baseline and the `l0fhm3`
  packed-multisig worst case. The invalid-vector files are not timed, because a rejecting tx invalidates the block
  before the Verify line is printed.

**Rig check.** Measured `l0fhm3` / `trxhzt` = 100.03 ms / 77.35 µs = **1293×**. The VM-limits CHIP's own BCHN
benchmarks report a RelCost of 1380× (i9-10980HK), 1357× (M1 Max) and 895× (i7-8700K) for the same pair. Our rig
reproduces the calibration's main ratio.

## Results (run 2, medians of 11)

### Sound-native verifiers and baselines

| workload | tx B | inputs | op-cost/tx | op-cost / budget | µs per tx | spread | **ns / op-cost** | ns / tx byte | × baseline tx |
|---|---|---|---|---|---|---|---|---|---|
| bare `OP_1` spend (per-input overhead) | 78 | 1 | 101 | 0.00 | 1.0 | 12% | – | 13 | 0.01 |
| P2PKH, ECDSA | 192 | 1 | 27,264 | 0.23 | 39.9 | 10% | 1.46 | 208 | 0.52 |
| P2PKH, Schnorr | 185 | 1 | 27,257 | 0.24 | 37.2 | 4% | 1.37 | 201 | 0.49 |
| `trxhzt` [baseline] 2×P2PKH (VMB, re-signed) | 367 | 2 | 54,521 | 0.24 | 77.3 | 2% | 1.42 | 211 | 1.00 |
| 50× bare 1-of-3 multisig, ECDSA bottom slot | 5,773 | 50 | 4,006,279 | 0.87 | 5,710 | 0.2% | 1.43 | 989 | 74 |
| **bn254-sound-native**, valid | 27,519 | 3 | 20,572,881 | 0.94 | **3,578** | 3.4% | **0.174** | **130** | 46 |
| bn254-sound-native, worst-case proof | 28,082 | 3 | 20,760,869 | 0.92 | 3,528 | 4.4% | 0.170 | 126 | 46 |
| bn254-sound-native, 3 extra proofs | ~27,050 | 3 | 19.85–19.87 M | 0.92 | 3,473–3,488 | ≤4% | 0.175–0.176 | 128.5–128.9 | 45 |
| **bls12381-sound-native**, valid | 34,089 | 4 | 24,040,286 | 0.88 | **3,032** | 2.9% | **0.126** | **89** | 40 |
| bls12381-sound-native, worst-case proof | 37,497 | 4 | 26,008,890 | 0.87 | 3,190 | 4.5% | 0.123 | 85 | 42 |
| bls12381-sound-native, 6 extra proofs | 34.0–36.1 k | 4 | 23.9–25.8 M | 0.86–0.91 | 3,039–3,163 | ≤3.9% | 0.122–0.128 | 87–91 | 40–41 |
| bn254 / bls12381 tampered proof (`invalid[0]`) | – | 3 / 4 | – | – | – | – | – | – | BCHN rejects: `blk-bad-inputs` (expected) |

"× baseline tx" means time per tx divided by the `trxhzt` baseline (77.3 µs). The CHIP uses the same
normalization, which it calls RelCost.

### VM-limits worst cases (2026 benchmark vectors)

| id | mode | what | tx B | in | op-cost/tx | µs per tx | ns / op-cost | ns / tx byte | RelCost |
|---|---|---|---|---|---|---|---|---|---|
| `l0fhm3` | standard | packed 1-of-3 bare multisig, ECDSA bottom slot (100 kB tx) | 100,002 | 873 | 69,949,583 | **100,027** | 1.43 | **1000** | 1293 |
| `gf8rlx` | nonstd | packed P2SH20, max bytes OP_RIPEMD160 hashed | 99,938 | 182 | 26,138,840 | 34,169 | 1.31 | 342 | 442 |
| `30mvm8` | standard | packed P2PK, Schnorr (100 kB) | 99,898 | 880 | 23,518,436 | 34,459 | 1.47 | 345 | 445 |
| `nhzssk` | nonstd | packed, max hash digests per byte | 99,966 | 403 | 62,874,448 | 31,165 | 0.50 | 312 | 403 |
| `w57j6w` | nonstd | OP_RIPEMD160 of 10,000 bytes, 65 B tx | 65 | 1 | 20,471 | 35.1 | **1.72** | 540 | 0.45 |
| `wx3f79` | standard | max 1-byte OP_MOD (1-by-10000 byte) | 73 | 1 | 41,184 | 29.9 | 0.73 | 410 | 0.39 |
| `u57mex` | standard | max OP_OR | 69 | 1 | 31,099 | 26.2 | 0.84 | 380 | 0.34 |
| `ap38fd` | standard | max OP_ROLL | 1,711 | 1 | 398,326 | 487 | 1.22 | 285 | 6.3 |
| `8qnlgt` | standard | max-cost OP_LSHIFTNUM | 211 | 2 | 34,010 | 39.0 | 1.15 | 185 | 0.50 |
| `2xhecr` | standard | max OP_SUB operand bytes | 85 | 1 | 51,214 | 26.4 | 0.52 | 310 | 0.34 |
| `u33zrd` / `snngzt` | nonstd | max OP_ADD / OP_MUL | 65–67 | 1 | 23–24 k | 16.5–16.8 | 0.69–0.72 | 250 | 0.22 |
| `nevxwn` | nonstd | max control-stack / stack usage | 1,315 | 1 | 1,033,859 | 437 | 0.42 | 332 | 5.7 |

Highest ns per op-cost unit in each vector set (op-cost ≥ 10,000 per tx; `raw/bchn-run2/summary.md` has all of them):

- Hashing (nonstandard): 1.72
- Signature checking: 1.34–1.50
- Packed hashing: 1.31
- OP_ROLL: 1.22
- Bitwise: 0.84–1.15
- Arithmetic: 0.66–0.73
- Stack: 0.44–0.52

Medians are much lower: 0.05 for div/mod and 0.08 for mul. These two classes charge operand bytes at a rate well above
BCHN's actual big-number cost.

## Reading

1. **Op-cost is a conservative proxy, calibrated on signature checks and hashing.** On BCHN, one op-cost unit costs
   1.3–1.7 ns in the worst cases, which are signature checks and hashing. Signature-check cost is exactly the
   26,000-per-sigcheck charge: about 1.4 ns per unit, or about 37 µs per ECDSA/Schnorr verify on this CPU. The limits
   were calibrated so that this per-byte worst case stays at today's level: `l0fhm3` takes about 1000 ns per tx byte
   (100 ms for a 100 kB standard tx), and single-input hashing takes about 540 ns per byte.
2. **Our sound-native verifiers spend about 8–14× less CPU per op-cost unit than that calibration point.**
   BN254: 0.17 ns/op-cost, 3.5 ms per verification. BLS12-381: 0.125 ns/op-cost, 3.0 ms. Their work is
   big-number field arithmetic, which op-cost charges at quadratic operand-byte rates that BCHN's bignum
   implementation does not come close to. Even so, the chains use 86–94% of their byte-tied budget. Per tx byte,
   they cost 130 ns (BN) and 89 ns (BLS): 13% and 9% of what `l0fhm3` costs per byte, and 24% / 16% of single-input
   hashing. A sound-native verification costs about the same as validating 40–46 ordinary 2-input P2PKH txs.
3. **For the byte-floor singletons (not runnable on BCHN), this is an extrapolation, not a measurement.** Assume a
   singleton's opcode mix costs what our chains cost per unit: 0.12–0.18 ns/op-cost. That interval is only an
   assumption. The kernels task and the bchd-fork/libauth runs are what measure it. Under that assumption:

   | singleton | bytes | op-cost | est. BCHN eval | est. ns / byte | × `l0fhm3` per byte |
   |---|---|---|---|---|---|
   | BN genpow | 4,613 | 5.52 B | 0.66–0.99 s | 144 k–215 k | 144–215× |
   | BN opcode-optimized | 6,237 | 800 M | 96–144 ms | 15 k–23 k | 15–23× |
   | BLS opcode-optimized | 5,999 | 1.0 B | 120–180 ms (≈125 ms at the BLS-chain rate) | 20 k–30 k | 20–30× |
   | BLS genpow | 5,965 | 25.6 B | 3.1–4.6 s (KERNELS.md: 6.06 s) | 520 k–770 k | 520–770× |

   (Superseded by KERNELS.md; REPORT.md has the final figures and their budget bases.) The singletons' op-cost is
   117–5,327× a P2SH32-style BCH 2026 budget ((44 + score bytes) × 800), or 2,838–130,130× the bare-locking budget.
   About one order of magnitude of that is
   op-cost overcharging bignum arithmetic relative to signature checks. What remains after that is real CPU. The
   opcode-optimized singletons would still cost 15–30× the worst per-byte validation time BCHN accepts today, and
   genpow about 150–200×. In absolute terms, one opcode-optimized verification would take about 0.1 s of BCHN CPU,
   about the same as the worst standard 100 kB tx. A genpow verification would take about 1 s.

## Rig usage (for the kernels task and anyone else)

Run these from the `zk-verifier-bench` checkout root (worktree `work/opcost-timing/bench`, branch `wip/opcost-timing`;
files in `research/opcost-timing/bchn/`):

```sh
R=research/opcost-timing/bchn
$R/node.sh start k1 9            # fresh regtest node "k1" pinned to CPU 9 (datadir work/opcost-timing/bchn-k1; must not exist)
taskset -c 5 npx tsx $R/run.ts --node k1 \
    --src json:/path/to/kernels.json \
    [--src vmb:/path/x.vmb_tests.json@accept] [--src builtin:baselines] [--src builtin:sound-native] \
    [--reps 11] [--target-opcost 2e8] [--max-copies 2000] [--max-block-bytes 8000000] [--filter REGEX] \
    --out ../raw/k1.jsonl
$R/node.sh stop k1
npx tsx $R/summarize.ts ../raw/k1.jsonl ../raw/k1.csv > ../raw/k1.md
# full calibration in one go: $R/run-all.sh NAME NODE_CPU DRIVER_CPU REPS  (writes work/opcost-timing/raw/bchn-NAME/)
```

Each `run.ts` invocation needs a **fresh node**, because it mines 220 blocks first to build its `OP_1` coinbase pool.
Use a new NAME every time. A datadir is about 175 MB.

`json:` workload format (hex strings; `valueSatoshis` defaults to 1000, `outputs` defaults to one 0-value
`OP_RETURN`):

```json
{"workloads":[{"id":"kern-fp-mul-x1000","description":"...","expect":"accept","version":2,"locktime":0,
  "inputs":[{"sourceLockingHex":"aa20…87","valueSatoshis":1000,"unlockingHex":"…","sequenceNumber":0}],
  "outputs":[{"lockingHex":"6a","valueSatoshis":0}]}]}
```

- Inputs must not carry signatures over the outpoint. Kernels with no signatures are fine.
- The tx must be consensus-valid under BCH 2026: per-input op-cost ≤ (41 + unlocking bytes) × 800, scripts ≤ 10,000 B,
  and a tx ≥ 65 B and ≤ 1 MB. Workloads above these limits must go to bchd-fork or libauth.
- `expect: "reject"` runs once and only checks the rejection.

Each result row has the following fields:

| field | contents |
|---|---|
| `opCostPerTx`, `opCostPerInput`, `budgetPerInput` | op-cost (libauth, exact bytes) per tx and per input, and each input's budget |
| `copies` (K) | number of workload txs in the timed block |
| `verifyMs` (all reps), `verifyStats` (median/min/max/spread) | BCHN Verify time per block |
| `submitVerifyMs` | Verify time of the final `submitblock` |
| `nsPerTx`, `nsPerOpCost`, `nsPerTxByte` | derived per-tx metrics |
| `libauthOk`, `bchnAccepted`, `asExpected` | accept/reject from libauth and BCHN, and whether both match `expect` |

Signature baselines are built in `workloads.ts` (`sign` field). For VMB vectors, `fromVmb` in `rig.ts` re-signs
automatically (P2PKH, bare P2PK, bare m-of-n multisig). Other signature shapes are reported as skipped.
