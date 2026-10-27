## Verifier workloads: ns per op-cost

Op-cost is each engine's own composite (non-standard) op-cost summed over the evaluated inputs; bchd also charges OP_DEFINE body bytes (BCHN rule), libauth does not. Eval = median of per-pass medians; spread = fastest..slowest repetition over all passes, as % of the median. Setup = decode + sighash midstate + engine construction (bchd) / decode (libauth). Budget unit = one op-cost unit of the VM budget the transaction is granted ((41 + unlocking) x 800 per input on BCH 2026; (10,000 + unlocking) x 800 on bch-spec); x worst vmb divides by the worst VM-limits vector (bchd: vmb:l0fhm3, libauth: vmb:ly54y8). RelCost/B = (time / baseline trxhzt time) / (tx bytes / 366), the CHIP metric.

| workload | mode | tx B | inputs | op-cost (bchd) | BCH-2026 budget | budget x | bchd eval ms | spread | bchd ns/op-cost | bchd setup µs | libauth eval ms | spread | libauth ns/op-cost | libauth/bchd | RelCost/B bchd | RelCost/B libauth | bchd ns/budget unit (own VM) | x worst vmb | libauth ns/budget unit | x worst vmb |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| bch-groth16-singleton:valid | loose | 334 | 1 | 771,304,255 | 250,400 | 3,080.3 | 296.97 | -4.7..+12.2% | 0.3850 | 26.6 | 2,095.5 | -5.2..+4.0% | 2.717 | 7.1 | 1,659.1 | 6,531.6 | 1,185.966 | 281.17 | 8,368.45 | 98.65 |
| bch-groth16-singleton:invalid | loose | 334 | 1 | 771,193,355 | 250,400 | 3,079.8 | 299.15 | -3.7..+24.8% | 0.3879 | 26.3 | 2,225.4 | -9.1..+16.1% | 2.886 | 7.4 | 1,671.3 | 6,936.5 | 1,194.681 | 283.23 | 8,887.31 | 104.77 |
| bch-groth16-singleton-opcode-optimized:valid | loose | 334 | 1 | 800,158,630 | 250,400 | 3,195.5 | 310.04 | -3.6..+23.0% | 0.3875 | 21.8 | 2,323.9 | -4.0..+13.7% | 2.904 | 7.5 | 1,732.2 | 7,243.5 | 1,238.171 | 293.54 | 9,280.61 | 109.40 |
| bch-groth16-singleton-opcode-optimized:invalid | loose | 334 | 1 | 800,057,196 | 250,400 | 3,195.1 | 305.30 | -4.1..+2.1% | 0.3816 | 20.9 | 2,239.6 | -3.6..+8.0% | 2.799 | 7.3 | 1,705.7 | 6,980.8 | 1,219.254 | 289.06 | 8,944.00 | 105.44 |
| bch-groth16-singleton-genpow:valid | loose | 268 | 1 | 5,519,655,221 | 199,200 | 27,709.1 | 1,986.89 | -1.3..+0.8% | 0.3600 | 22.6 | 13,021.2 | -2.0..+8.9% | 2.359 | 6.6 | 13,834.4 | 50,582.5 | 9,974.339 | 2,364.69 | 65,367.48 | 770.59 |
| bch-groth16-singleton-genpow:invalid | loose | 268 | 1 | 5,519,490,023 | 199,200 | 27,708.3 | 1,977.46 | -1.4..+2.6% | 0.3583 | 22.1 | 13,097.3 | -1.0..+5.2% | 2.373 | 6.6 | 13,768.8 | 50,878.1 | 9,926.996 | 2,353.47 | 65,749.51 | 775.09 |
| bch-groth16-singleton-minop:valid | loose | 7,509 | 1 | 64,844,252 | 5,990,400 | 10.8 | 38.99 | -16.7..+5.8% | 0.6013 | 120.9 | 286.2 | -3.9..+16.4% | 4.415 | 7.3 | 9.7 | 39.7 | 6.509 | 1.54 | 47.78 | 0.56 |
| bch-groth16-singleton-minop:invalid | loose | 7,445 | 1 | 64,415,095 | 5,939,200 | 10.8 | 39.10 | -17.5..+9.7% | 0.6070 | 128.2 | 283.0 | -2.7..+14.4% | 4.394 | 7.2 | 9.8 | 39.6 | 6.583 | 1.56 | 47.65 | 0.56 |
| bch-groth16-bls12381-singleton:valid | loose | 459 | 1 | 994,592,972 | 350,400 | 2,838.5 | 276.22 | -5.1..+3.0% | 0.2777 | 30.2 | 2,006.4 | -1.9..+2.5% | 2.017 | 7.3 | 1,123.0 | 4,550.9 | 788.298 | 186.89 | 5,726.17 | 67.50 |
| bch-groth16-bls12381-singleton:invalid | loose | 459 | 1 | 994,437,528 | 350,400 | 2,838.0 | 279.53 | -3.3..+2.9% | 0.2811 | 29.3 | 2,018.8 | -2.4..+2.2% | 2.030 | 7.2 | 1,136.4 | 4,579.0 | 797.746 | 189.13 | 5,761.55 | 67.92 |
| bch-groth16-bls12381-singleton-opcode-optimized:valid | loose | 459 | 1 | 1,003,515,113 | 350,400 | 2,863.9 | 283.71 | -2.7..+2.3% | 0.2827 | 22.8 | 2,069.2 | -2.0..+3.9% | 2.062 | 7.3 | 1,153.4 | 4,693.3 | 809.676 | 191.96 | 5,905.30 | 69.61 |
| bch-groth16-bls12381-singleton-opcode-optimized:invalid | loose | 459 | 1 | 1,003,360,568 | 350,400 | 2,863.5 | 282.20 | -2.2..+5.0% | 0.2813 | 23.0 | 2,090.8 | -3.0..+4.6% | 2.084 | 7.4 | 1,147.3 | 4,742.2 | 805.366 | 190.93 | 5,966.88 | 70.34 |
| bch-groth16-bls12381-singleton-genpow:valid | loose | 265 | 1 | 25,609,645,438 | 196,800 | 130,130.3 | 14,282.88 | -2.9..+9.4% | 0.5577 | 20.7 | 83,766.3 | -2.1..+1.0% | 3.271 | 5.9 | 100,575.7 | 329,084.6 | 72,575.596 | 17,206.03 | 425,641.79 | 5,017.68 |
| bch-groth16-bls12381-singleton-genpow:invalid | loose | 265 | 1 | 25,609,434,141 | 196,800 | 130,129.2 | 14,143.44 | -3.1..+4.8% | 0.5523 | 22.0 | 82,804.5 | -0.4..+1.1% | 3.233 | 5.9 | 99,593.8 | 325,306.1 | 71,867.092 | 17,038.06 | 420,754.68 | 4,960.07 |
| bch-groth16-bls12381-singleton-minop:valid | loose | 809 | 1 | 145,599,283 | 630,400 | 231.0 | 59.19 | -8.0..+63.4% | 0.4065 | 76.0 | 449.6 | -2.6..+12.0% | 3.088 | 7.6 | 136.5 | 578.6 | 93.888 | 22.26 | 713.22 | 8.41 |
| bch-groth16-bls12381-singleton-minop:invalid | loose | 809 | 1 | 145,427,103 | 630,400 | 230.7 | 59.14 | -8.1..+9.6% | 0.4066 | 80.7 | 446.5 | -0.9..+12.2% | 3.070 | 7.6 | 136.4 | 574.6 | 93.807 | 22.24 | 708.25 | 8.35 |
| bch-groth16-sound-si-gls-single:valid | bchspec | 21,880 | 1 | 23,338,058 | 17,486,400 | 1.3 | 9.10 | -1.8..+14.4% | 0.3900 | 5.0 | 111.1 | -7.5..+33.0% | 4.761 | 12.2 | 0.8 | 5.3 | 0.358 | 0.08 | 4.36 | 0.05 |
| bch-groth16-sound-si-gls-single:invalid | bchspec | 21,880 | 1 | 23,332,828 | 17,486,400 | 1.3 | 9.11 | -1.8..+28.9% | 0.3903 | 6.1 | 124.6 | -17.5..+39.6% | 5.339 | 13.7 | 0.8 | 5.9 | 0.358 | 0.08 | 4.89 | 0.06 |
| bch-groth16-bls12381-sound-si-gls-single:valid | bchspec | 26,449 | 1 | 26,073,214 | 21,141,600 | 1.2 | 7.73 | -0.9..+35.6% | 0.2965 | 4.8 | 103.8 | -14.3..+27.4% | 3.983 | 13.4 | 0.5 | 4.1 | 0.266 | 0.06 | 3.57 | 0.04 |
| bch-groth16-bls12381-sound-si-gls-single:invalid | bchspec | 26,449 | 1 | 26,070,735 | 21,141,600 | 1.2 | 7.78 | -1.7..+27.5% | 0.2984 | 5.3 | 106.6 | -14.7..+39.2% | 4.090 | 13.7 | 0.5 | 4.2 | 0.267 | 0.06 | 3.66 | 0.04 |
| bch-groth16-bn254-sound-native:valid | bch2026 | 27,519 | 3 | 20,616,435 | 21,994,400 | 0.9 | 7.69 | -2.7..+45.0% | 0.3732 | 6.6 | 85.7 | -15.3..+16.8% | 4.165 | 11.1 | 0.5 | 3.2 | 0.350 | 0.08 | 3.90 | 0.05 |
| bch-groth16-bn254-sound-native:invalid | bch2026 | 27,519 | 3 | 13,831,741 | 21,994,400 | 0.6 | 5.03 | -1.5..+45.0% | 0.3634 | 6.7 | 65.2 | -23.1..+19.7% | 4.730 | 13.0 | 0.3 | 2.5 | 0.229 | 0.05 | 2.97 | 0.03 |
| bch-groth16-bls12381-sound-native:valid | bch2026 | 34,089 | 4 | 24,091,590 | 27,248,800 | 0.9 | 7.16 | -3.6..+75.9% | 0.2973 | 9.0 | 92.0 | -21.3..+21.7% | 3.827 | 12.8 | 0.4 | 2.8 | 0.263 | 0.06 | 3.38 | 0.04 |
| bch-groth16-bls12381-sound-native:invalid | bch2026 | 34,089 | 4 | 19,698,248 | 27,248,800 | 0.7 | 5.63 | -1.0..+22.5% | 0.2859 | 7.1 | 75.7 | -16.2..+47.3% | 3.852 | 13.4 | 0.3 | 2.3 | 0.207 | 0.05 | 2.78 | 0.03 |

## VM-limits benchmark vectors (libauth bch_2026 standard + nonstandard *benchmarks*)

291 transactions, every input evaluated, every verdict and primary-input op-cost checked against the vectors. Baseline trxhzt: bchd 196.1 µs, libauth 351.6 µs.


### Worst cases by bchd ns per budget unit (time / sum of input budgets: what the byte-tied budget lets a tx cost)

| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd RelCost/B | libauth µs | libauth ns/op-cost | libauth ns/budget unit | libauth RelCost/B | description |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| l0fhm3 | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337,328.0 | 4.822 | 4.2180 | 6.30 | 6,076,946.9 | 86.876 | 75.9877 | 63.27 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| xuxr6e | standard/core.benchmarks.signature-checking.bms-ecdsa | 134 | 80,125 | 88% | 299.8 | 3.742 | 3.2875 | 4.18 | 467.0 | 5.828 | 5.1204 | 3.63 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (E |
| t0z6jt | standard/core.benchmarks.signature-checking.p2pk | 99,960 | 24,955,546 | 31% | 191,455.1 | 7.672 | 2.3947 | 3.57 | 1,415,985.6 | 56.740 | 17.7108 | 14.75 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all Schno |
| d5rw9l | standard/core.benchmarks.signature-checking.bms-schnorr | 99,922 | 25,300,600 | 32% | 190,258.2 | 7.520 | 2.3806 | 3.55 | 2,195,048.4 | 86.759 | 27.4656 | 22.87 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| vzvufa | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,989 | 69,279,106 | 87% | 168,543.4 | 2.433 | 2.1075 | 3.15 | 2,010,412.5 | 29.019 | 25.1385 | 20.93 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| 30mvm8 | standard/core.benchmarks.signature-checking.p2pk | 99,904 | 23,518,442 | 29% | 164,785.0 | 7.007 | 2.0622 | 3.08 | 1,237,523.6 | 52.619 | 15.4873 | 12.90 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all ECDSA |
| 99mssa | standard/core.benchmarks.signature-checking.p2pkh | 99,991 | 19,325,213 | 24% | 121,274.2 | 6.275 | 1.5164 | 2.26 | 679,549.9 | 35.164 | 8.4970 | 7.08 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PKH inputs, 1 output (all Schn |
| p406sl | standard/core.benchmarks.signature-checking.p2pkh | 99,872 | 18,457,382 | 23% | 110,751.9 | 6.000 | 1.3865 | 2.07 | 633,611.6 | 34.328 | 7.9320 | 6.60 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PKH inputs, 1 output (all ECDS |
| 49mkxm | standard/core.benchmarks.signature-checking.p2pk | 127 | 26,719 | 31% | 104.0 | 3.892 | 1.2149 | 1.53 | 176.1 | 6.590 | 2.0571 | 1.44 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, P2PK input, 1 output (Schnorr signature |
| 0r7ngd | standard/core.benchmarks.signature-checking.bms-schnorr | 128 | 27,352 | 32% | 104.0 | 3.804 | 1.2042 | 1.52 | 199.9 | 7.309 | 2.3139 | 1.63 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (S |
| c4chnz | standard/core.benchmarks.signature-checking.bms-ecdsa | 134 | 79,357 | 87% | 97.5 | 1.229 | 1.0691 | 1.36 | 255.2 | 3.216 | 2.7981 | 1.98 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (E |
| plq235 | standard/core.benchmarks.signature-checking.p2pk | 133 | 26,725 | 30% | 94.3 | 3.529 | 1.0432 | 1.32 | 202.3 | 7.569 | 2.2377 | 1.58 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, P2PK input, 1 output (ECDSA signature)  |

### Worst cases by bchd ns per op-cost unit

| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd RelCost/B | libauth µs | libauth ns/op-cost | libauth ns/budget unit | libauth RelCost/B | description |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| t0z6jt | standard/core.benchmarks.signature-checking.p2pk | 99,960 | 24,955,546 | 31% | 191,455.1 | 7.672 | 2.3947 | 3.57 | 1,415,985.6 | 56.740 | 17.7108 | 14.75 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all Schno |
| d5rw9l | standard/core.benchmarks.signature-checking.bms-schnorr | 99,922 | 25,300,600 | 32% | 190,258.2 | 7.520 | 2.3806 | 3.55 | 2,195,048.4 | 86.759 | 27.4656 | 22.87 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| 30mvm8 | standard/core.benchmarks.signature-checking.p2pk | 99,904 | 23,518,442 | 29% | 164,785.0 | 7.007 | 2.0622 | 3.08 | 1,237,523.6 | 52.619 | 15.4873 | 12.90 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all ECDSA |
| 99mssa | standard/core.benchmarks.signature-checking.p2pkh | 99,991 | 19,325,213 | 24% | 121,274.2 | 6.275 | 1.5164 | 2.26 | 679,549.9 | 35.164 | 8.4970 | 7.08 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PKH inputs, 1 output (all Schn |
| p406sl | standard/core.benchmarks.signature-checking.p2pkh | 99,872 | 18,457,382 | 23% | 110,751.9 | 6.000 | 1.3865 | 2.07 | 633,611.6 | 34.328 | 7.9320 | 6.60 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PKH inputs, 1 output (all ECDS |
| l0fhm3 | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337,328.0 | 4.822 | 4.2180 | 6.30 | 6,076,946.9 | 86.876 | 75.9877 | 63.27 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| 49mkxm | standard/core.benchmarks.signature-checking.p2pk | 127 | 26,719 | 31% | 104.0 | 3.892 | 1.2149 | 1.53 | 176.1 | 6.590 | 2.0571 | 1.44 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, P2PK input, 1 output (Schnorr signature |
| vx8cqv | standard/core.benchmarks.signature-checking.p2pkh | 161 | 27,257 | 24% | 104.6 | 3.839 | 0.9276 | 1.21 | 182.6 | 6.697 | 1.6184 | 1.18 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, P2PKH input, 1 output (Schnorr signatur |
| 0r7ngd | standard/core.benchmarks.signature-checking.bms-schnorr | 128 | 27,352 | 32% | 104.0 | 3.804 | 1.2042 | 1.52 | 199.9 | 7.309 | 2.3139 | 1.63 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (S |
| xuxr6e | standard/core.benchmarks.signature-checking.bms-ecdsa | 134 | 80,125 | 88% | 299.8 | 3.742 | 3.2875 | 4.18 | 467.0 | 5.828 | 5.1204 | 3.63 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (E |
| trxhzt | standard/core.benchmarks.baseline | 366 | 54,520 | 24% | 196.1 | 3.598 | 0.8513 | 1.00 | 351.6 | 6.448 | 1.5259 | 1.00 | Transaction validation benchmarks: [baseline] 2 P2PKH inputs, 2 P2PKH outputs (one Schnorr signature, one ECDS |
| 8qnlgt | standard/chip.benchmarks.bitwise | 211 | 34,010 | 23% | 122.3 | 3.595 | 0.8396 | 1.08 | 1,510.8 | 44.422 | 10.3763 | 7.45 | Transaction validation benchmarks: max-cost OP_LSHIFTNUM (P2S) |

### Worst cases by libauth ns per budget unit

| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd RelCost/B | libauth µs | libauth ns/op-cost | libauth ns/budget unit | libauth RelCost/B | description |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| ly54y8 | standard/core.benchmarks.arithmetic.div-mod | 72 | 41,343 | 99% | 34.2 | 0.827 | 0.8216 | 0.89 | 3,528.9 | 85.356 | 84.8284 | 51.03 | Transaction validation benchmarks: Within BCH_2025_05 P2SH20/standard, single-input limits, maximize 1-byte OP |
| 90e2p7 | standard/core.benchmarks.arithmetic.div-mod | 72 | 41,342 | 99% | 33.8 | 0.818 | 0.8133 | 0.88 | 3,509.7 | 84.894 | 84.3675 | 50.75 | Transaction validation benchmarks: Within BCH_2025_05 P2SH32/standard, single-input limits, maximize 1-byte OP |
| l0fhm3 | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337,328.0 | 4.822 | 4.2180 | 6.30 | 6,076,946.9 | 86.876 | 75.9877 | 63.27 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| v8lscg | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,190 | 98% | 32.5 | 0.634 | 0.6242 | 0.71 | 3,941.6 | 76.999 | 75.7998 | 48.28 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_SUB oper |
| 2xhecr | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,214 | 98% | 32.1 | 0.627 | 0.6172 | 0.70 | 3,937.0 | 76.874 | 75.7118 | 48.22 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_SUB oper |
| des0rv | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,193 | 98% | 32.1 | 0.627 | 0.6168 | 0.70 | 3,924.4 | 76.658 | 75.4683 | 48.07 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_ADD oper |
| xg7206 | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,217 | 98% | 31.7 | 0.620 | 0.6102 | 0.70 | 3,903.2 | 76.210 | 75.0620 | 47.81 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_ADD oper |
| gwvyrp | standard/core.benchmarks.arithmetic.mul | 72 | 41,340 | 99% | 35.4 | 0.857 | 0.8517 | 0.92 | 2,481.6 | 60.028 | 59.6529 | 35.88 | Transaction validation benchmarks: Within BCH_2025_05 P2SH20/standard, single-input limits, maximize 1-byte OP |

### Worst cases by bchd RelCostPerByte (time relative to baseline trxhzt, per byte relative to its 366 B: the CHIP metric)

| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd RelCost/B | libauth µs | libauth ns/op-cost | libauth ns/budget unit | libauth RelCost/B | description |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| l0fhm3 | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337,328.0 | 4.822 | 4.2180 | 6.30 | 6,076,946.9 | 86.876 | 75.9877 | 63.27 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| xuxr6e | standard/core.benchmarks.signature-checking.bms-ecdsa | 134 | 80,125 | 88% | 299.8 | 3.742 | 3.2875 | 4.18 | 467.0 | 5.828 | 5.1204 | 3.63 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, 1-of-3 bare multisig input, 1 output (E |
| t0z6jt | standard/core.benchmarks.signature-checking.p2pk | 99,960 | 24,955,546 | 31% | 191,455.1 | 7.672 | 2.3947 | 3.57 | 1,415,985.6 | 56.740 | 17.7108 | 14.75 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all Schno |
| d5rw9l | standard/core.benchmarks.signature-checking.bms-schnorr | 99,922 | 25,300,600 | 32% | 190,258.2 | 7.520 | 2.3806 | 3.55 | 2,195,048.4 | 86.759 | 27.4656 | 22.87 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| vzvufa | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,989 | 69,279,106 | 87% | 168,543.4 | 2.433 | 2.1075 | 3.15 | 2,010,412.5 | 29.019 | 25.1385 | 20.93 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| 30mvm8 | standard/core.benchmarks.signature-checking.p2pk | 99,904 | 23,518,442 | 29% | 164,785.0 | 7.007 | 2.0622 | 3.08 | 1,237,523.6 | 52.619 | 15.4873 | 12.90 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed P2PK inputs, 1 output (all ECDSA |

### Worst cases by libauth RelCostPerByte

| id | group | tx B | op-cost | budget used | bchd µs | bchd ns/op-cost | bchd ns/budget unit | bchd RelCost/B | libauth µs | libauth ns/op-cost | libauth ns/budget unit | libauth RelCost/B | description |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| l0fhm3 | standard/core.benchmarks.signature-checking.bms-ecdsa | 99,988 | 69,949,569 | 87% | 337,328.0 | 4.822 | 4.2180 | 6.30 | 6,076,946.9 | 86.876 | 75.9877 | 63.27 | Transaction validation benchmarks: Within BCH_2023_05 standard limits, packed 1-of-3 bare multisig inputs, 1 o |
| ly54y8 | standard/core.benchmarks.arithmetic.div-mod | 72 | 41,343 | 99% | 34.2 | 0.827 | 0.8216 | 0.89 | 3,528.9 | 85.356 | 84.8284 | 51.03 | Transaction validation benchmarks: Within BCH_2025_05 P2SH20/standard, single-input limits, maximize 1-byte OP |
| 90e2p7 | standard/core.benchmarks.arithmetic.div-mod | 72 | 41,342 | 99% | 33.8 | 0.818 | 0.8133 | 0.88 | 3,509.7 | 84.894 | 84.3675 | 50.75 | Transaction validation benchmarks: Within BCH_2025_05 P2SH32/standard, single-input limits, maximize 1-byte OP |
| v8lscg | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,190 | 98% | 32.5 | 0.634 | 0.6242 | 0.71 | 3,941.6 | 76.999 | 75.7998 | 48.28 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_SUB oper |
| 2xhecr | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,214 | 98% | 32.1 | 0.627 | 0.6172 | 0.70 | 3,937.0 | 76.874 | 75.7118 | 48.22 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_SUB oper |
| des0rv | standard/core.benchmarks.arithmetic.add-sub | 85 | 51,193 | 98% | 32.1 | 0.627 | 0.6168 | 0.70 | 3,924.4 | 76.658 | 75.4683 | 48.07 | Transaction validation benchmarks: Within BCH_2025_05 P2SH/standard, single-input limits, maximize OP_ADD oper |

### Per vector group (bchd): median and max ns/op-cost and ns/budget unit

| group | n | median ns/op-cost | max ns/op-cost | max ns/budget unit | libauth median ns/op-cost | libauth max ns/op-cost |
|---|--:|--:|--:|--:|--:|--:|
| standard/chip.benchmarks.bitwise | 4 | 1.977 | 3.595 | 0.8396 | 17.957 | 44.422 |
| standard/core.benchmarks.arithmetic.add-sub | 15 | 0.604 | 0.853 | 0.8458 | 41.100 | 76.999 |
| standard/core.benchmarks.arithmetic.div-mod | 40 | 0.099 | 0.827 | 0.8216 | 3.543 | 85.356 |
| standard/core.benchmarks.arithmetic.mul | 24 | 0.250 | 0.920 | 0.8542 | 10.399 | 60.028 |
| standard/core.benchmarks.baseline | 1 | 3.598 | 3.598 | 0.8513 | 6.448 | 6.448 |
| standard/core.benchmarks.bitwise | 18 | 0.155 | 0.216 | 0.1712 | 6.863 | 13.014 |
| standard/core.benchmarks.hashing | 33 | 0.579 | 1.389 | 0.1289 | 26.600 | 28.149 |
| standard/core.benchmarks.roll | 8 | 0.055 | 0.186 | 0.0548 | 5.636 | 5.875 |
| standard/core.benchmarks.signature-checking.bms-ecdsa | 4 | 3.087 | 4.822 | 4.2180 | 17.424 | 86.876 |
| standard/core.benchmarks.signature-checking.bms-schnorr | 2 | 5.662 | 7.520 | 2.3806 | 47.034 | 86.759 |
| standard/core.benchmarks.signature-checking.p2pk | 4 | 5.449 | 7.672 | 2.3947 | 30.094 | 56.740 |
| standard/core.benchmarks.signature-checking.p2pkh | 4 | 4.920 | 6.275 | 1.5164 | 21.076 | 35.164 |
| standard/core.benchmarks.stack | 17 | 0.146 | 0.484 | 0.1004 | 6.741 | 25.685 |
| nonstandard/core.benchmarks.arithmetic.add-sub | 2 | 0.551 | 0.585 | 0.3538 | 43.337 | 43.903 |
| nonstandard/core.benchmarks.arithmetic.div-mod | 2 | 0.648 | 0.660 | 0.3777 | 40.548 | 42.631 |
| nonstandard/core.benchmarks.arithmetic.mul | 1 | 0.890 | 0.890 | 0.6198 | 42.756 | 42.756 |
| nonstandard/core.benchmarks.hashing-bytes.packed | 10 | 0.470 | 1.234 | 0.4050 | 7.292 | 7.628 |
| nonstandard/core.benchmarks.hashing-iters.packed | 10 | 0.218 | 0.853 | 0.6705 | 2.786 | 3.034 |
| nonstandard/core.benchmarks.hashing | 88 | 0.390 | 1.379 | 0.7333 | 14.995 | 67.765 |
| nonstandard/core.benchmarks.stack | 4 | 0.476 | 0.497 | 0.4965 | 23.565 | 26.426 |

## Opcode-class profile: bchd

Per instruction: wall time of Engine.Step (op + accounting + limit checks) minus the measured empty-span timer overhead; op-cost = composite op-cost delta of that step. Cells: time share / op-cost share. Last columns: profiled time per op-cost unit per class (ns).

| workload | mul/div/mod | add/sub/cmp/shift | hashing | sigcheck | push | stack | bytes/serialization | introspection | control | other | ns/op-cost by class (mul/div/mod; hashing; sigcheck; stack+push+bytes; control) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| bch-groth16-singleton:valid | 57/56 | 21/5 | - | - | 7/19 | 8/11 | - | - | 7/9 | - | 0.351; -; -; 0.171; 0.273 |
| bch-groth16-singleton:invalid | 57/56 | 21/5 | - | - | 7/19 | 8/11 | - | - | 7/9 | - | 0.367; -; -; 0.177; 0.285 |
| bch-groth16-singleton-opcode-optimized:valid | 56/54 | 20/5 | - | - | 7/19 | 9/12 | - | - | 8/9 | - | 0.360; -; -; 0.188; 0.289 |
| bch-groth16-singleton-opcode-optimized:invalid | 56/54 | 20/5 | - | - | 7/19 | 9/12 | - | - | 8/9 | - | 0.385; -; -; 0.193; 0.314 |
| bch-groth16-singleton-genpow:valid | 65/61 | 12/3 | - | - | 7/17 | 8/10 | - | - | 8/9 | - | 0.371; -; -; 0.184; 0.290 |
| bch-groth16-singleton-genpow:invalid | 65/61 | 12/3 | - | - | 7/17 | 8/10 | - | - | 8/9 | - | 0.371; -; -; 0.189; 0.300 |
| bch-groth16-singleton-minop:valid | 43/47 | 41/15 | - | - | 4/15 | 11/23 | 0/0 | - | 1/1 | - | 0.476; -; -; 0.216; 0.385 |
| bch-groth16-singleton-minop:invalid | 39/48 | 43/15 | - | - | 5/15 | 12/22 | 0/0 | - | 1/1 | - | 0.452; -; -; 0.267; 0.474 |
| bch-groth16-bls12381-singleton:valid | 57/70 | 24/4 | - | - | 6/12 | 8/9 | - | - | 6/5 | - | 0.218; -; -; 0.173; 0.285 |
| bch-groth16-bls12381-singleton:invalid | 57/70 | 24/4 | - | - | 6/12 | 8/9 | - | - | 6/5 | - | 0.233; -; -; 0.181; 0.296 |
| bch-groth16-bls12381-singleton-opcode-optimized:valid | 56/69 | 23/4 | - | - | 6/12 | 8/9 | - | - | 6/6 | - | 0.220; -; -; 0.186; 0.295 |
| bch-groth16-bls12381-singleton-opcode-optimized:invalid | 55/69 | 23/4 | - | - | 7/12 | 8/9 | - | - | 6/6 | - | 0.223; -; -; 0.205; 0.297 |
| bch-groth16-bls12381-singleton-genpow:valid | 69/68 | 23/9 | - | - | 2/7 | 4/12 | - | - | 2/4 | - | 0.574; -; -; 0.158; 0.353 |
| bch-groth16-bls12381-singleton-genpow:invalid | 69/68 | 23/9 | - | - | 2/7 | 4/12 | - | - | 2/4 | - | 0.531; -; -; 0.146; 0.332 |
| bch-groth16-bls12381-singleton-minop:valid | 45/60 | 40/9 | - | - | 3/12 | 10/17 | 0/0 | - | 2/2 | - | 0.324; -; -; 0.194; 0.357 |
| bch-groth16-bls12381-singleton-minop:invalid | 47/60 | 37/9 | - | - | 4/12 | 10/17 | 0/0 | - | 2/2 | - | 0.287; -; -; 0.175; 0.338 |
| bch-groth16-sound-si-gls-single:valid | 58/61 | 24/7 | 0/0 | - | 5/10 | 11/19 | 2/2 | - | 1/1 | - | 0.361; 0.399; -; 0.207; 0.207 |
| bch-groth16-sound-si-gls-single:invalid | 58/61 | 24/7 | 0/0 | - | 5/10 | 11/19 | 2/2 | - | 1/1 | - | 0.361; 0.391; -; 0.209; 0.204 |
| bch-groth16-bls12381-sound-si-gls-single:valid | 56/71 | 28/6 | 0/0 | - | 4/7 | 9/13 | 2/2 | - | 1/1 | - | 0.228; 0.386; -; 0.193; 0.252 |
| bch-groth16-bls12381-sound-si-gls-single:invalid | 56/71 | 28/6 | 0/0 | - | 4/7 | 9/13 | 2/2 | - | 1/1 | - | 0.227; 0.396; -; 0.198; 0.275 |
| bch-groth16-bn254-sound-native:valid | 57/58 | 21/6 | 0/0 | - | 5/11 | 11/18 | 3/4 | 0/1 | 2/2 | - | 0.344; 0.390; -; 0.201; 0.429 |
| bch-groth16-bn254-sound-native:invalid | 56/56 | 21/6 | 0/0 | - | 5/11 | 11/18 | 4/5 | 0/1 | 2/2 | - | 0.342; 0.389; -; 0.194; 0.413 |
| bch-groth16-bls12381-sound-native:valid | 52/67 | 28/6 | 0/0 | - | 4/8 | 9/13 | 4/4 | 0/1 | 2/1 | - | 0.216; 0.392; -; 0.191; 0.532 |
| bch-groth16-bls12381-sound-native:invalid | 53/67 | 29/6 | 0/0 | - | 4/7 | 9/13 | 3/4 | 0/1 | 2/1 | - | 0.216; 0.385; -; 0.187; 0.500 |
| lx24w3 | - | - | 0/0 | 99/44 | 0/1 | 0/0 | 0/54 | - | - | - | -; 7.310; 125.233; 0.447; - |
| 8qnlgt | - | 13/18 | 1/1 | 86/77 | 1/2 | 0/1 | 0/0 | - | - | - | -; 2.988; 4.098; 0.994; - |
| 4r9wdp | - | 7/0 | 1/0 | 84/33 | 1/1 | 0/13 | 8/52 | - | - | - | -; 3.194; 4.052; 0.210; - |
| e2knc8 | - | 3/0 | 1/0 | 88/45 | 1/2 | 0/0 | 7/52 | - | - | - | -; 3.113; 4.068; 0.293; - |
| 7s4l4d | - | 75/71 | 5/2 | - | 3/2 | 9/25 | 7/0 | - | - | - | -; 1.868; -; 0.496; - |
| wjg8aj | - | 77/71 | 2/2 | - | 3/2 | 10/25 | 8/0 | - | - | - | -; 0.774; -; 0.490; - |
| wc6z2q | - | 71/69 | 5/2 | - | 3/2 | 15/26 | 6/0 | - | - | - | -; 2.186; -; 0.622; - |
| 3z4fuw | - | 75/69 | 3/2 | - | 4/2 | 11/26 | 8/0 | - | - | - | -; 0.754; -; 0.423; - |
| 479864 | - | 78/70 | 5/2 | - | 3/3 | 7/25 | 6/0 | - | - | - | -; 1.934; -; 0.399; - |
| pp6twr | - | 80/70 | 2/2 | - | 3/3 | 9/25 | 6/0 | - | - | - | -; 0.752; -; 0.425; - |
| des0rv | - | 69/39 | 2/0 | - | 1/1 | 0/20 | 28/40 | - | - | - | -; 3.109; -; 0.344; - |
| xg7206 | - | 73/39 | 1/1 | - | 1/1 | 0/20 | 25/40 | - | - | - | -; 0.812; -; 0.279; - |
| v8lscg | - | 73/39 | 2/0 | - | 1/1 | 0/20 | 23/40 | - | - | - | -; 2.750; -; 0.276; - |
| 2xhecr | - | 74/39 | 1/1 | - | 1/1 | 0/20 | 24/40 | - | - | - | -; 0.735; -; 0.274; - |
| y54lkh | - | 87/32 | 3/0 | - | 2/1 | 1/34 | 8/34 | - | - | - | -; 2.746; -; 0.073; - |
| 9vkccn | - | 91/32 | 1/0 | - | 2/1 | 0/34 | 6/34 | - | - | - | -; 0.769; -; 0.057; - |
| 53s3xu | - | 73/1 | 6/1 | - | 3/1 | 1/49 | 16/49 | - | - | - | -; 2.827; -; 0.063; - |
| f7qhsg | - | 88/37 | 3/1 | - | 2/1 | 0/21 | 7/40 | - | - | - | -; 2.746; -; 0.090; - |
| 09macl | - | 97/65 | 1/0 | - | 0/0 | 1/33 | 1/1 | - | - | - | -; 2.215; -; 0.067; - |
| mzgxue | 64/58 | 18/15 | 4/2 | - | 3/3 | 7/23 | 5/0 | - | - | - | 0.875; 1.686; -; 0.424; - |
| cps57g | 66/58 | 17/15 | 2/2 | - | 2/3 | 7/23 | 5/0 | - | - | - | 0.811; 0.777; -; 0.405; - |
| xyd798 | 66/60 | 16/14 | 4/2 | - | 2/2 | 7/22 | 5/0 | - | - | - | 0.802; 1.775; -; 0.434; - |
| djc9j4 | 66/60 | 16/14 | 2/2 | - | 2/2 | 8/22 | 5/0 | - | - | - | 0.754; 0.796; -; 0.425; - |
| cg58ck | 91/47 | - | 2/0 | - | 1/1 | 0/18 | 5/34 | - | - | - | 1.136; 2.827; -; 0.079; - |
| 4wrejp | 76/23 | 1/0 | 5/1 | - | 3/1 | 3/26 | 12/49 | - | - | - | 1.244; 2.831; -; 0.091; - |
| v6gq6s | 78/23 | 1/0 | 2/1 | - | 4/1 | 1/26 | 14/49 | - | - | - | 1.255; 1.081; -; 0.091; - |
| khn0me | 83/73 | - | 5/0 | - | 2/1 | 1/10 | 9/17 | - | - | - | 0.353; 3.270; -; 0.135; - |
| ydc5f4 | 87/73 | - | 1/0 | - | 2/1 | 1/10 | 8/17 | - | - | - | 0.369; 0.923; -; 0.131; - |
| 8h53rn | 58/79 | 2/0 | 12/1 | - | 7/1 | 1/7 | 19/12 | - | - | - | 0.097; 2.665; -; 0.175; - |
| tfj2qe | 64/79 | 3/0 | 4/1 | - | 7/1 | 2/7 | 20/12 | - | - | - | 0.100; 0.769; -; 0.178; - |
| ptzjns | 49/85 | 2/0 | 16/1 | - | 8/1 | 3/5 | 22/8 | - | - | - | 0.064; 2.746; -; 0.272; - |
| 0p0kn7 | 53/85 | 3/0 | 6/1 | - | 10/1 | 2/5 | 26/8 | - | - | - | 0.061; 0.812; -; 0.277; - |
| p4hnrn | 42/89 | 4/0 | 20/1 | - | 11/1 | 1/4 | 22/5 | - | - | - | 0.050; 3.153; -; 0.375; - |
| 398646 | 42/89 | 5/0 | 9/1 | - | 12/1 | 3/4 | 29/5 | - | - | - | 0.037; 1.042; -; 0.365; - |
| 0qyjxr | 34/92 | 3/0 | 23/1 | - | 11/1 | 3/3 | 25/3 | - | - | - | 0.033; 2.948; -; 0.469; - |
| xp2mgv | 38/92 | 4/0 | 9/1 | - | 14/1 | 4/3 | 31/3 | - | - | - | 0.030; 0.888; -; 0.469; - |
| 8zk9rg | 33/92 | 4/0 | 20/1 | - | 11/1 | 4/3 | 28/3 | - | - | - | 0.026; 2.665; -; 0.423; - |
| zyrc2f | 51/96 | - | 13/1 | - | 8/1 | 0/1 | 28/2 | - | - | - | 0.072; 2.750; -; 1.367; - |
| wa3e5m | 45/96 | - | 7/1 | - | 11/1 | 1/1 | 36/2 | - | - | - | 0.044; 0.965; -; 1.256; - |
| ly54y8 | 77/59 | - | 2/1 | - | 1/1 | - | 20/40 | - | - | - | 1.165; 3.149; -; 0.455; - |
| 90e2p7 | 79/58 | - | 1/1 | - | 1/1 | - | 19/40 | - | - | - | 1.142; 0.927; -; 0.431; - |
| jlc8j2 | 81/23 | - | 4/1 | - | 2/1 | 1/26 | 12/49 | - | - | - | 1.762; 2.871; -; 0.099; - |
| jp2gew | 77/23 | - | 5/1 | - | 3/1 | 2/26 | 13/49 | - | - | - | 1.254; 2.585; -; 0.088; - |
| lthl39 | 79/23 | - | 2/1 | - | 3/1 | 1/26 | 14/49 | - | - | - | 1.280; 0.962; -; 0.093; - |
| 8mk9lv | 73/68 | - | 8/1 | - | 4/1 | 2/11 | 14/19 | - | - | - | 0.237; 3.230; -; 0.132; - |
| ees8ps | 78/68 | - | 3/1 | - | 4/1 | 2/11 | 14/19 | - | - | - | 0.234; 1.081; -; 0.124; - |
| gmd96n | 59/79 | - | 13/1 | - | 7/1 | 1/7 | 20/12 | - | - | - | 0.097; 2.907; -; 0.181; - |
| j87vmt | 61/79 | - | 4/1 | - | 9/1 | 2/7 | 24/12 | - | - | - | 0.098; 0.885; -; 0.215; - |
| yfqvz4 | 50/86 | - | 18/1 | - | 8/1 | 2/5 | 23/8 | - | - | - | 0.067; 3.190; -; 0.272; - |
| pj67rn | 52/86 | - | 5/1 | - | 11/1 | 2/5 | 29/8 | - | - | - | 0.057; 0.769; -; 0.300; - |
| 06368y | 46/90 | - | 19/1 | - | 8/1 | 2/4 | 24/5 | - | - | - | 0.057; 3.113; -; 0.406; - |
| kpuh7h | 45/90 | - | 7/1 | - | 12/1 | 2/4 | 34/5 | - | - | - | 0.042; 0.885; -; 0.413; - |
| a0jeux | 38/92 | - | 22/1 | - | 12/1 | 2/3 | 26/3 | - | - | - | 0.038; 2.907; -; 0.512; - |
| 8y2whd | 44/92 | - | 9/1 | - | 13/1 | 3/3 | 31/3 | - | - | - | 0.034; 0.923; -; 0.468; - |
| c0rm8d | 39/92 | - | 21/1 | - | 11/1 | 4/3 | 25/3 | - | - | - | 0.032; 2.786; -; 0.422; - |
| lnwaz3 | 48/96 | 4/0 | 14/1 | - | 9/1 | 0/1 | 26/2 | - | - | - | 0.063; 2.827; -; 1.275; - |
| p2c47w | 43/96 | 3/0 | 8/1 | - | 10/1 | 1/1 | 36/2 | - | - | - | 0.039; 1.042; -; 1.166; - |
| wx3f79 | 62/49 | - | 3/1 | - | 2/1 | - | 33/49 | - | - | - | 0.876; 3.028; -; 0.474; - |
| u83yzg | 66/49 | - | 1/1 | - | 2/1 | - | 31/49 | - | - | - | 0.853; 0.965; -; 0.405; - |
| swae3w | 84/70 | - | 3/2 | - | 2/5 | 6/23 | 5/0 | - | - | - | 1.350; 1.845; -; 0.530; - |
| qhx767 | 85/70 | - | 1/2 | - | 2/5 | 7/23 | 5/0 | - | - | - | 1.202; 0.754; -; 0.479; - |
| ps2qy8 | 90/47 | - | 2/0 | - | 1/1 | 0/18 | 6/34 | - | - | - | 1.214; 2.907; -; 0.093; - |
| fd2aev | 92/47 | - | 1/0 | - | 1/1 | 0/18 | 6/34 | - | - | - | 1.255; 0.965; -; 0.089; - |
| q6znzv | 93/47 | - | 1/0 | - | 1/1 | 0/18 | 4/34 | - | - | - | 1.911; 2.988; -; 0.100; - |
| y3rkt0 | 92/47 | - | 1/0 | - | 1/1 | 0/18 | 6/34 | - | - | - | 1.277; 0.812; -; 0.092; - |
| g2d82f | 90/73 | - | 3/0 | - | 1/1 | 1/10 | 5/17 | - | - | - | 0.641; 3.194; -; 0.143; - |
| 5f3496 | 86/73 | - | 1/0 | - | 2/1 | 1/10 | 9/17 | - | - | - | 0.378; 0.927; -; 0.146; - |
| 468t4m | 86/81 | - | 4/1 | - | 2/1 | 0/7 | 7/11 | - | - | - | 0.370; 2.871; -; 0.184; - |
| vf0t0g | 83/81 | - | 2/1 | - | 3/1 | 1/7 | 11/11 | - | - | - | 0.251; 0.808; -; 0.191; - |
| dt9vcn | 75/86 | - | 9/1 | - | 5/1 | 1/5 | 11/7 | - | - | - | 0.190; 3.069; -; 0.281; - |
| 5gruzp | 78/86 | - | 3/1 | - | 5/1 | 1/5 | 13/7 | - | - | - | 0.171; 0.846; -; 0.283; - |
| kycymh | 66/90 | - | 11/1 | - | 6/1 | 1/4 | 16/5 | - | - | - | 0.128; 3.069; -; 0.432; - |
| 5vfk64 | 71/90 | - | 4/1 | - | 7/1 | 1/4 | 17/5 | - | - | - | 0.118; 0.885; -; 0.405; - |
| mqttrf | 64/92 | - | 13/1 | - | 7/1 | 1/3 | 15/3 | - | - | - | 0.113; 3.113; -; 0.531; - |
| rehnu5 | 69/92 | - | 5/1 | - | 7/1 | 1/3 | 18/3 | - | - | - | 0.102; 0.927; -; 0.510; - |
| cgkp7j | 64/92 | - | 12/1 | - | 6/1 | 2/3 | 16/3 | - | - | - | 0.095; 2.948; -; 0.468; - |
| pf86u7 | 69/92 | - | 4/1 | - | 7/1 | 2/3 | 18/3 | - | - | - | 0.095; 0.923; -; 0.472; - |
| pg83j6 | 56/96 | - | 13/1 | - | 8/1 | 0/1 | 24/2 | - | - | - | 0.087; 3.069; -; 1.343; - |
| 8t6h2y | 61/96 | - | 5/1 | - | 8/1 | 1/1 | 24/2 | - | - | - | 0.082; 1.038; -; 1.198; - |
| s8czyv | 78/59 | - | 2/1 | - | 1/1 | - | 19/40 | - | - | - | 1.243; 2.992; -; 0.468; - |
| fwtkxa | 79/58 | - | 1/1 | - | 1/1 | - | 19/40 | - | - | - | 1.251; 1.042; -; 0.471; - |
| gwvyrp | 77/59 | - | 2/1 | - | 2/1 | - | 19/40 | - | - | - | 1.221; 2.988; -; 0.479; - |
| dpaptk | 78/58 | - | 1/1 | - | 1/1 | - | 20/40 | - | - | - | 1.242; 1.004; -; 0.474; - |
| trxhzt | - | - | 1/1 | 99/97 | 0/2 | 0/0 | 0/0 | - | - | - | -; 2.589; 4.108; 0.880; - |
| pxknd8 | - | - | 3/0 | - | 2/0 | 4/47 | 91/53 | - | - | - | -; 1.823; -; 0.158; - |
| cmayp9 | - | - | 1/0 | - | 2/0 | 4/47 | 93/53 | - | - | - | -; 0.754; -; 0.152; - |
| wg648r | - | - | 3/0 | - | 2/0 | 4/47 | 92/53 | - | - | - | -; 1.823; -; 0.153; - |
| 2tmhns | - | - | 1/0 | - | 2/0 | 4/47 | 93/53 | - | - | - | -; 0.732; -; 0.154; - |
| vyfs9e | - | - | 3/0 | - | 2/0 | 4/47 | 91/52 | - | - | - | -; 1.866; -; 0.153; - |
| desctt | - | - | 1/0 | - | 2/0 | 4/47 | 93/52 | - | - | - | -; 0.688; -; 0.152; - |
| 4wm0d3 | - | - | 8/1 | - | 5/1 | 0/33 | 86/65 | - | - | - | -; 3.069; -; 0.286; - |
| 7lm98w | - | - | 3/1 | - | 5/1 | 0/32 | 91/65 | - | - | - | -; 1.000; -; 0.275; - |
| ayavrh | - | - | 9/1 | - | 6/1 | 1/33 | 85/65 | - | - | - | -; 3.109; -; 0.257; - |
| u57mex | - | - | 3/1 | - | 6/1 | 0/32 | 90/65 | - | - | - | -; 0.888; -; 0.253; - |
| 4g330z | - | - | 1/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.726; -; 0.150; - |
| gjj3m6 | - | - | 0/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.469; -; 0.143; - |
| pzkpz6 | - | - | 1/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.738; -; 0.146; - |
| vy8dax | - | - | 0/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.484; -; 0.147; - |
| mtwr0s | - | - | 1/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.726; -; 0.142; - |
| ny933k | - | - | 0/0 | - | 0/0 | 3/47 | 96/53 | - | - | - | -; 0.463; -; 0.148; - |
| rdn5u2 | - | - | 13/0 | - | 10/0 | 15/90 | 62/9 | - | - | - | -; 2.232; -; 0.047; - |
| 630nga | - | - | 3/0 | - | 6/0 | 37/90 | 55/9 | - | - | - | -; 0.865; -; 0.090; - |
| f8q8qr | - | - | 64/47 | - | 8/7 | - | 28/46 | - | - | - | -; 2.573; -; 1.273; - |
| z83vh9 | - | - | 62/47 | - | 9/12 | - | 29/42 | - | - | - | -; 2.481; -; 1.319; - |
| 9susd7 | - | - | 61/47 | - | 8/12 | - | 31/42 | - | - | - | -; 2.191; -; 1.249; - |
| hfmhj6 | - | - | 61/48 | - | 7/6 | - | 32/45 | - | - | - | -; 2.511; -; 1.510; - |
| 3ptmtc | - | - | 61/48 | - | 8/11 | - | 31/41 | - | - | - | -; 2.555; -; 1.455; - |
| weeulq | - | - | 61/48 | - | 9/12 | - | 30/41 | - | - | - | -; 2.326; -; 1.350; - |
| paj8qc | - | - | 66/47 | - | 8/6 | - | 26/46 | - | - | - | -; 2.400; -; 1.106; - |
| 30eyuf | - | - | 65/47 | - | 8/11 | - | 27/42 | - | - | - | -; 2.364; -; 1.113; - |
| gh9dl6 | - | - | 64/47 | - | 9/11 | - | 27/42 | - | - | - | -; 2.152; -; 1.082; - |
| wrtsdg | - | - | 49/47 | - | 11/7 | - | 39/46 | - | - | - | -; 1.198; -; 1.095; - |
| 32x702 | - | - | 42/47 | - | 16/12 | - | 42/42 | - | - | - | -; 0.896; -; 1.068; - |
| 6w82jc | - | - | 29/47 | - | 17/12 | - | 55/42 | - | - | - | -; 0.488; -; 1.051; - |
| cwk8s3 | - | - | 26/48 | - | 16/6 | - | 59/45 | - | - | - | -; 0.406; -; 1.106; - |
| admadu | - | - | 41/48 | - | 15/11 | - | 43/41 | - | - | - | -; 0.773; -; 0.996; - |
| plnxr5 | - | - | 31/48 | - | 17/12 | - | 52/41 | - | - | - | -; 0.459; -; 0.939; - |
| pr4pzg | - | - | 28/47 | - | 17/6 | - | 55/46 | - | - | - | -; 0.406; -; 0.954; - |
| hk95ge | - | - | 42/47 | - | 14/11 | - | 44/42 | - | - | - | -; 0.722; -; 0.885; - |
| jwexpz | - | - | 29/47 | - | 20/11 | - | 51/42 | - | - | - | -; 0.700; -; 1.510; - |
| 4tt8x6 | - | - | 16/47 | - | 20/7 | - | 64/46 | - | - | - | -; 0.503; -; 2.342; - |
| qsytu9 | - | - | 47/47 | - | 15/12 | - | 39/42 | - | - | - | -; 1.680; -; 1.691; - |
| q8hvd6 | - | - | 23/47 | - | 25/12 | - | 52/41 | - | - | - | -; 0.750; -; 2.200; - |
| mc3nlk | - | - | 22/48 | - | 18/6 | - | 60/45 | - | - | - | -; 0.547; -; 1.846; - |
| h5yvem | - | - | 48/48 | - | 11/11 | - | 41/41 | - | - | - | -; 1.670; -; 1.649; - |
| 50c7jl | - | - | 25/48 | - | 19/12 | - | 57/41 | - | - | - | -; 0.502; -; 1.391; - |
| t77tn5 | - | - | 24/48 | - | 15/6 | - | 61/46 | - | - | - | -; 0.455; -; 1.295; - |
| jf95ck | - | - | 40/47 | - | 13/11 | - | 48/42 | - | - | - | -; 1.054; -; 1.410; - |
| r3axym | - | - | 27/47 | - | 14/11 | - | 59/42 | - | - | - | -; 0.473; -; 1.141; - |
| ua7859 | - | - | 46/48 | - | 10/6 | - | 45/45 | - | - | - | -; 1.128; -; 1.255; - |
| rnnrg8 | - | - | 47/48 | - | 12/11 | - | 42/41 | - | - | - | -; 1.218; -; 1.246; - |
| rjd8aj | - | - | 42/48 | - | 12/12 | - | 46/41 | - | - | - | -; 1.036; -; 1.290; - |
| kfrw39 | - | - | 27/48 | - | 15/6 | - | 58/45 | - | - | - | -; 0.475; -; 1.199; - |
| djk4vz | - | - | 41/48 | - | 11/11 | - | 48/41 | - | - | - | -; 1.064; -; 1.411; - |
| 7ap9wf | - | - | 29/48 | - | 16/12 | - | 55/41 | - | - | - | -; 0.501; -; 1.112; - |
| uuz4z3 | - | - | 15/0 | - | 9/1 | 49/98 | 27/0 | - | - | - | -; 3.416; -; 0.059; - |
| wfd0jv | - | - | 5/0 | - | 11/1 | 51/98 | 32/0 | - | - | - | -; 0.865; -; 0.047; - |
| 2h5x79 | - | - | 12/0 | - | 11/2 | 50/97 | 27/0 | - | - | - | -; 2.268; -; 0.054; - |
| aqa938 | - | - | 4/0 | - | 10/2 | 52/97 | 33/0 | - | - | - | -; 0.719; -; 0.058; - |
| 64h7ly | - | - | 11/0 | - | 10/5 | 55/94 | 24/0 | - | - | - | -; 1.888; -; 0.063; - |
| 23tlfd | - | - | 4/0 | - | 10/5 | 62/94 | 24/0 | - | - | - | -; 0.638; -; 0.063; - |
| se6qet | - | - | 2/0 | 12/1 | 4/9 | 76/89 | 7/0 | - | - | - | -; 0.955; 1.920; 0.166; - |
| ap38fd | - | - | 1/0 | 11/1 | 4/9 | 78/89 | 7/0 | - | - | - | -; 0.463; 1.726; 0.165; - |
| xuxr6e | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 4.177; 0.772; - |
| l0fhm3 | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 4.905; 0.434; - |
| c4chnz | - | - | - | 99/99 | 1/1 | - | - | - | - | - | -; -; 1.420; 1.173; - |
| vzvufa | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 2.463; 0.356; - |
| 0r7ngd | - | - | - | 99/97 | 1/3 | - | - | - | - | - | -; -; 4.237; 0.890; - |
| d5rw9l | - | - | - | 100/97 | 0/3 | - | - | - | - | - | -; -; 7.668; 0.373; - |
| 49mkxm | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 4.220; 1.376; - |
| t0z6jt | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 7.773; 0.320; - |
| plq235 | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 3.990; 1.118; - |
| 30mvm8 | - | - | - | 100/99 | 0/1 | - | - | - | - | - | -; -; 7.260; 0.324; - |
| vx8cqv | - | - | 2/1 | 97/97 | 0/2 | 0/0 | 0/0 | - | - | - | -; 7.069; 4.250; 1.752; - |
| 99mssa | - | - | 0/1 | 100/97 | 0/2 | 0/0 | 0/0 | - | - | - | -; 1.505; 6.673; 0.286; - |
| jyqemh | - | - | 1/1 | 99/97 | 0/2 | 0/0 | 0/0 | - | - | - | -; 2.907; 3.983; 1.094; - |
| p406sl | - | - | 0/1 | 100/97 | 0/2 | 0/0 | 0/0 | - | - | - | -; 1.549; 6.324; 0.259; - |
| 35f8yl | - | - | 6/0 | - | 22/0 | 53/99 | 19/0 | - | - | - | -; 2.118; -; 0.102; - |
| p7aeva | - | - | 3/0 | - | 22/1 | 59/99 | 16/0 | - | - | - | -; 0.841; -; 0.093; - |
| x4ddtw | - | - | 10/0 | - | 19/2 | 63/98 | 7/0 | - | - | - | -; 4.098; -; 0.109; - |
| y05lce | - | - | 3/0 | - | 30/2 | 55/98 | 11/0 | - | - | - | -; 0.777; -; 0.068; - |
| 3ne030 | - | - | 11/1 | - | 6/1 | 3/74 | 79/25 | - | - | - | -; 4.081; -; 0.193; - |
| 7z9hne | - | - | 4/1 | - | 7/1 | 2/74 | 87/25 | - | - | - | -; 1.042; -; 0.147; - |
| 9p30lt | - | - | 20/0 | - | 10/1 | 4/35 | 66/64 | - | - | - | -; 3.472; -; 0.062; - |
| ss72kv | - | 69/72 | 2/1 | 11/3 | 1/4 | 9/20 | 8/0 | - | - | - | -; 0.721; 1.905; 0.355; - |
| l0acpe | - | 71/72 | 1/1 | 11/3 | 1/4 | 8/20 | 9/0 | - | - | - | -; 0.458; 1.739; 0.327; - |
| 8zmhnl | - | 36/19 | 3/1 | - | 1/1 | 45/79 | 15/0 | - | - | - | -; 0.786; -; 0.187; - |
| xxy89j | - | 41/19 | 2/1 | - | 1/1 | 39/79 | 17/0 | - | - | - | -; 0.463; -; 0.149; - |
| a3ujmu | - | 65/58 | 2/1 | 12/3 | 1/4 | 8/22 | 9/0 | - | 3/12 | - | -; 0.710; 1.730; 0.271; 0.106 |
| 5sxtzw | - | 65/58 | 1/1 | 12/3 | 1/4 | 8/22 | 9/0 | - | 3/12 | - | -; 0.463; 1.773; 0.277; 0.098 |
| g2qj8r | - | - | 7/1 | - | 3/1 | 18/14 | 28/0 | - | 45/83 | - | -; 0.802; -; 0.403; 0.070 |
| xqlhvr | - | - | 4/1 | - | 3/1 | 22/14 | 28/0 | - | 43/83 | - | -; 0.490; -; 0.427; 0.066 |
| w6v3jd | - | - | 9/1 | - | 5/1 | 8/2 | 37/0 | - | 41/96 | - | -; 0.759; -; 1.418; 0.040 |
| 5pvlyk | - | - | 6/1 | - | 4/1 | 8/2 | 41/0 | - | 42/96 | - | -; 0.463; -; 1.410; 0.039 |
| u33zrd | - | 88/74 | - | - | 2/0 | 10/26 | - | - | - | - | -; -; -; 0.291; - |
| vd72vn | - | 84/72 | - | - | 3/0 | 14/27 | - | - | - | - | -; -; -; 0.302; - |
| nsw96e | 72/60 | 19/15 | - | - | 2/1 | 8/24 | - | - | - | - | 0.891; -; -; 0.285; - |
| deq7jk | 72/62 | 18/15 | - | - | 2/1 | 8/23 | - | - | - | - | 0.771; -; -; 0.276; - |
| snngzt | 92/73 | - | - | - | 1/3 | 7/24 | - | - | - | - | 1.308; -; -; 0.319; - |
| gf8rlx | - | - | 69/49 | - | 0/8 | 0/0 | 31/43 | - | - | - | -; 2.030; -; 0.883; - |
| 4u6jsk | - | - | 77/49 | - | 0/8 | 0/0 | 23/43 | - | - | - | -; 2.091; -; 0.608; - |
| 3y7jmz | - | - | 44/49 | - | 1/8 | 0/0 | 55/43 | - | - | - | -; 0.364; -; 0.442; - |
| 3kftnk | - | - | 46/49 | - | 1/8 | 0/0 | 53/43 | - | - | - | -; 0.365; -; 0.412; - |
| jallhq | - | - | 41/49 | - | 1/8 | 0/0 | 58/43 | - | - | - | -; 0.394; -; 0.547; - |
| mws83a | - | - | 44/49 | - | 1/8 | 0/0 | 55/43 | - | - | - | -; 0.394; -; 0.495; - |
| 0ns36s | - | - | 58/51 | - | 1/7 | 0/0 | 41/41 | - | - | - | -; 0.636; -; 0.482; - |
| 7r6evv | - | - | 62/51 | - | 1/7 | 0/0 | 38/41 | - | - | - | -; 0.638; -; 0.416; - |
| pmk7we | - | - | 49/52 | - | 1/7 | 0/0 | 50/41 | - | - | - | -; 0.427; -; 0.474; - |
| maydtv | - | - | 51/52 | - | 1/7 | 0/0 | 48/41 | - | - | - | -; 0.429; -; 0.436; - |
| nhzssk | - | - | 92/38 | - | 0/0 | 1/28 | 7/33 | - | - | - | -; 2.019; -; 0.111; - |
| 7w3kz4 | - | - | 95/38 | - | 0/0 | 1/28 | 4/33 | - | - | - | -; 1.961; -; 0.066; - |
| j6nl2n | - | - | 78/38 | - | 1/0 | 3/28 | 18/33 | - | - | - | -; 0.364; -; 0.065; - |
| d53dwe | - | - | 78/38 | - | 1/0 | 3/28 | 18/33 | - | - | - | -; 0.364; -; 0.064; - |
| z9y43g | - | - | 79/38 | - | 1/0 | 3/28 | 17/33 | - | - | - | -; 0.390; -; 0.064; - |
| ta05ww | - | - | 80/38 | - | 1/0 | 3/28 | 16/33 | - | - | - | -; 0.390; -; 0.061; - |
| n0yzej | - | - | 86/40 | - | 0/0 | 2/27 | 11/32 | - | - | - | -; 0.620; -; 0.068; - |
| 7tq2sl | - | - | 86/40 | - | 0/0 | 2/27 | 12/32 | - | - | - | -; 0.621; -; 0.070; - |
| lcennk | - | - | 82/40 | - | 1/0 | 3/27 | 14/32 | - | - | - | -; 0.427; -; 0.062; - |
| ntcrvp | - | - | 83/40 | - | 1/0 | 3/27 | 14/32 | - | - | - | -; 0.428; -; 0.061; - |
| yxrclk | - | - | 83/49 | - | 1/8 | 0/0 | 17/43 | - | - | - | -; 1.989; -; 0.401; - |
| 83v867 | - | - | 82/49 | - | 1/8 | 0/0 | 17/43 | - | - | - | -; 1.982; -; 0.422; - |
| 0uk59w | - | - | 49/49 | - | 2/8 | 0/0 | 49/43 | - | - | - | -; 0.380; -; 0.383; - |
| q5mn2f | - | - | 48/49 | - | 2/8 | 0/0 | 50/43 | - | - | - | -; 0.361; -; 0.373; - |
| xvg04z | - | - | 50/49 | - | 2/8 | 0/0 | 48/43 | - | - | - | -; 0.393; -; 0.386; - |
| k7ar59 | - | - | 50/49 | - | 2/8 | 0/0 | 48/43 | - | - | - | -; 0.387; -; 0.383; - |
| 26gphy | - | - | 64/51 | - | 1/7 | 0/0 | 35/41 | - | - | - | -; 0.636; -; 0.373; - |
| f49kmv | - | - | 54/51 | - | 3/7 | 0/0 | 43/41 | - | - | - | -; 0.836; -; 0.738; - |
| quqgxg | - | - | 50/52 | - | 3/7 | 0/0 | 46/41 | - | - | - | -; 0.446; -; 0.465; - |
| cdr2df | - | - | 52/52 | - | 2/7 | 0/0 | 46/41 | - | - | - | -; 0.424; -; 0.413; - |
| j0yjwy | - | - | 92/38 | - | 0/0 | 3/28 | 4/33 | - | - | - | -; 2.044; -; 0.103; - |
| f75j0v | - | - | 94/38 | - | 0/0 | 1/28 | 4/33 | - | - | - | -; 1.964; -; 0.082; - |
| 8n2t3l | - | - | 76/38 | - | 2/0 | 4/28 | 18/33 | - | - | - | -; 0.386; -; 0.075; - |
| 3venyq | - | - | 76/38 | - | 2/0 | 5/28 | 17/33 | - | - | - | -; 0.358; -; 0.069; - |
| amtdvz | - | - | 77/38 | - | 1/0 | 5/28 | 16/33 | - | - | - | -; 0.404; -; 0.074; - |
| ynhjy6 | - | - | 77/38 | - | 2/0 | 5/28 | 16/33 | - | - | - | -; 0.391; -; 0.075; - |
| 4ekawh | - | - | 84/40 | - | 1/0 | 4/27 | 11/32 | - | - | - | -; 0.633; -; 0.081; - |
| 75g9ph | - | - | 86/40 | - | 1/0 | 3/27 | 10/32 | - | - | - | -; 0.625; -; 0.070; - |
| e976ul | - | - | 81/40 | - | 2/0 | 4/27 | 13/32 | - | - | - | -; 0.435; -; 0.067; - |
| kzrfmf | - | - | 81/40 | - | 2/0 | 4/27 | 14/32 | - | - | - | -; 0.422; -; 0.067; - |
| wawpr9 | - | - | 67/48 | - | 6/6 | - | 26/46 | - | - | - | -; 2.681; -; 1.224; - |
| cl46p5 | - | - | 61/48 | - | 10/11 | - | 29/41 | - | - | - | -; 2.641; -; 1.543; - |
| j92sv9 | - | - | 58/48 | - | 11/11 | - | 31/41 | - | - | - | -; 2.294; -; 1.524; - |
| wuzzxx | - | - | 78/50 | - | 2/1 | - | 21/49 | - | - | - | -; 2.385; -; 0.680; - |
| s39rs5 | - | - | 77/49 | - | 3/2 | - | 21/49 | - | - | - | -; 2.329; -; 0.692; - |
| q5fhf3 | - | - | 75/49 | - | 3/2 | - | 22/49 | - | - | - | -; 2.343; -; 0.761; - |
| 08mujk | - | - | 77/50 | - | 1/1 | - | 22/49 | - | - | - | -; 2.339; -; 0.698; - |
| c8mklq | - | - | 78/50 | - | 1/2 | - | 21/48 | - | - | - | -; 2.312; -; 0.648; - |
| gznx32 | - | - | 78/50 | - | 2/2 | - | 21/48 | - | - | - | -; 2.286; -; 0.647; - |
| w57j6w | - | - | 79/50 | - | 1/1 | - | 20/49 | - | - | - | -; 2.303; -; 0.617; - |
| mu0yve | - | - | 79/50 | - | 2/2 | - | 19/48 | - | - | - | -; 2.323; -; 0.610; - |
| jh35lq | - | - | 80/50 | - | 1/2 | - | 19/48 | - | - | - | -; 2.275; -; 0.569; - |
| javle6 | - | - | 49/48 | - | 12/6 | - | 40/46 | - | - | - | -; 0.963; -; 0.953; - |
| nmed72 | - | - | 41/48 | - | 13/11 | - | 46/41 | - | - | - | -; 0.784; -; 1.024; - |
| qrqfcc | - | - | 31/48 | - | 13/11 | - | 56/41 | - | - | - | -; 0.454; -; 0.935; - |
| zf085d | - | - | 41/50 | - | 4/1 | - | 55/49 | - | - | - | -; 0.370; -; 0.522; - |
| p8rc2k | - | - | 38/49 | - | 4/2 | - | 58/49 | - | - | - | -; 0.432; -; 0.695; - |
| rxw3n5 | - | - | 41/49 | - | 4/2 | - | 55/49 | - | - | - | -; 0.370; -; 0.516; - |
| ulnedq | - | - | 43/50 | - | 3/1 | - | 54/49 | - | - | - | -; 0.355; -; 0.462; - |
| vugk9k | - | - | 41/50 | - | 8/2 | - | 51/48 | - | - | - | -; 0.493; -; 0.694; - |
| dqlvp5 | - | - | 35/50 | - | 10/2 | - | 55/48 | - | - | - | -; 0.433; -; 0.775; - |
| gen82y | - | - | 37/50 | - | 5/1 | - | 58/49 | - | - | - | -; 0.381; -; 0.629; - |
| sfhsmk | - | - | 44/50 | - | 5/2 | - | 51/48 | - | - | - | -; 0.621; -; 0.767; - |
| ez294u | - | - | 32/50 | - | 8/2 | - | 60/48 | - | - | - | -; 0.387; -; 0.805; - |
| z90re2 | - | - | 21/49 | - | 18/6 | - | 61/45 | - | - | - | -; 0.519; -; 1.824; - |
| 802aqr | - | - | 39/48 | - | 15/11 | - | 46/41 | - | - | - | -; 1.418; -; 2.032; - |
| y0xwll | - | - | 28/48 | - | 16/11 | - | 57/41 | - | - | - | -; 0.597; -; 1.426; - |
| la0qdy | - | - | 35/50 | - | 4/1 | - | 61/49 | - | - | - | -; 0.382; -; 0.712; - |
| 3l5fpk | - | - | 40/49 | - | 9/2 | - | 51/49 | - | - | - | -; 0.580; -; 0.841; - |
| 8wysry | - | - | 33/49 | - | 7/2 | - | 59/48 | - | - | - | -; 0.411; -; 0.810; - |
| f706dv | - | - | 34/50 | - | 4/1 | - | 62/49 | - | - | - | -; 0.386; -; 0.741; - |
| p2jx4r | - | - | 43/50 | - | 5/2 | - | 53/48 | - | - | - | -; 0.597; -; 0.784; - |
| 5ate89 | - | - | 37/50 | - | 4/2 | - | 58/48 | - | - | - | -; 0.426; -; 0.700; - |
| qcqxkd | - | - | 38/50 | - | 4/1 | - | 58/49 | - | - | - | -; 0.389; -; 0.636; - |
| kyr3h4 | - | - | 46/50 | - | 4/2 | - | 50/48 | - | - | - | -; 0.561; -; 0.645; - |
| 9sdxkn | - | - | 37/50 | - | 6/2 | - | 57/48 | - | - | - | -; 0.399; -; 0.669; - |
| dkmlmd | - | - | 43/49 | - | 10/6 | - | 47/44 | - | - | - | -; 1.114; -; 1.449; - |
| tnlvav | - | - | 49/48 | - | 12/11 | - | 39/40 | - | - | - | -; 1.367; -; 1.354; - |
| 7lvzfk | - | - | 40/48 | - | 14/11 | - | 46/40 | - | - | - | -; 1.071; -; 1.512; - |
| 76n6uw | - | - | 42/48 | - | 10/6 | - | 48/46 | - | - | - | -; 1.133; -; 1.454; - |
| w9kztv | - | - | 48/48 | - | 12/11 | - | 41/41 | - | - | - | -; 1.253; -; 1.256; - |
| 4y38aj | - | - | 43/48 | - | 13/11 | - | 45/41 | - | - | - | -; 0.920; -; 1.121; - |
| 3wpqru | - | - | 39/49 | - | 11/6 | - | 51/45 | - | - | - | -; 0.938; -; 1.454; - |
| mtzn9u | - | - | 47/48 | - | 13/11 | - | 39/41 | - | - | - | -; 1.116; -; 1.172; - |
| svlfpg | - | - | 47/48 | - | 11/11 | - | 41/40 | - | - | - | -; 1.009; -; 1.068; - |
| nc7rrl | - | - | 41/50 | - | 3/1 | - | 56/49 | - | - | - | -; 0.468; -; 0.678; - |
| z2s7mq | - | - | 42/50 | - | 4/2 | - | 54/48 | - | - | - | -; 0.507; -; 0.694; - |
| 7xnktq | - | - | 42/50 | - | 5/2 | - | 53/48 | - | - | - | -; 0.458; -; 0.633; - |
| d5dlj7 | - | - | 43/50 | - | 4/2 | - | 53/48 | - | - | - | -; 0.476; -; 0.627; - |
| lzxugf | - | - | 42/50 | - | 4/2 | - | 54/48 | - | - | - | -; 0.446; -; 0.614; - |
| twtnps | - | - | 43/50 | - | 4/2 | - | 53/48 | - | - | - | -; 0.485; -; 0.629; - |
| t66cdq | - | - | 40/50 | - | 4/2 | - | 56/48 | - | - | - | -; 0.448; -; 0.659; - |
| g7slt0 | - | - | 27/49 | - | 17/6 | - | 57/44 | - | - | - | -; 0.475; -; 1.278; - |
| vs4fkg | - | - | 62/49 | - | 9/11 | - | 29/40 | - | - | - | -; 3.148; -; 1.818; - |
| 42n0gk | - | - | 27/49 | - | 16/11 | - | 56/40 | - | - | - | -; 0.484; -; 1.208; - |
| yktva0 | - | - | 26/49 | - | 15/6 | - | 59/45 | - | - | - | -; 0.481; -; 1.266; - |
| gesmtc | - | - | 43/48 | - | 15/11 | - | 41/41 | - | - | - | -; 1.282; -; 1.533; - |
| kqkg8j | - | - | 24/48 | - | 24/11 | - | 52/41 | - | - | - | -; 0.828; -; 2.405; - |
| ers893 | - | - | 23/49 | - | 15/6 | - | 62/44 | - | - | - | -; 0.511; -; 1.665; - |
| wzfj9h | - | - | 39/49 | - | 15/11 | - | 45/41 | - | - | - | -; 1.402; -; 2.067; - |
| mgrutq | - | - | 25/49 | - | 18/11 | - | 57/40 | - | - | - | -; 0.519; -; 1.500; - |
| c7culk | - | - | 35/50 | - | 5/1 | - | 60/49 | - | - | - | -; 0.403; -; 0.753; - |
| 2y670y | - | - | 41/50 | - | 5/2 | - | 54/48 | - | - | - | -; 0.573; -; 0.812; - |
| flankj | - | - | 35/50 | - | 4/2 | - | 61/48 | - | - | - | -; 0.420; -; 0.771; - |
| 5lv0pa | - | - | 44/50 | - | 4/2 | - | 52/48 | - | - | - | -; 0.537; -; 0.682; - |
| u04df7 | - | - | 35/50 | - | 6/2 | - | 59/48 | - | - | - | -; 0.409; -; 0.741; - |
| zsh52j | - | - | 42/50 | - | 5/2 | - | 53/48 | - | - | - | -; 0.560; -; 0.770; - |
| gpe444 | - | - | 34/50 | - | 7/2 | - | 59/48 | - | - | - | -; 0.404; -; 0.759; - |
| 4z3ggm | - | - | - | - | 13/1 | 87/99 | - | - | - | - | -; -; -; 0.034; - |
| 9nd5e9 | - | 96/96 | - | 2/0 | 0/1 | 2/3 | 0/0 | - | - | - | -; -; 2.222; 0.245; - |
| m7sdck | - | 96/87 | - | - | 0/0 | 4/13 | 0/0 | - | - | - | -; -; -; 0.138; - |
| nevxwn | - | 96/93 | - | 2/0 | 0/1 | 2/4 | 0/0 | - | 1/2 | - | -; -; 1.846; 0.211; 0.125 |

## Opcode-class profile: libauth

Per instruction: exclusive operation time minus timer overhead; the per-instruction `every` hook (op-cost accounting, limit checks) is the VM loop/accounting row; op-cost delta of `every` is attributed to the opcode just executed. Cells: time share / op-cost share.

| workload | mul/div/mod | add/sub/cmp/shift | hashing | sigcheck | push | stack | bytes/serialization | introspection | control | VM loop/accounting | other | ns/op-cost by class (mul/div/mod; hashing; sigcheck; stack+push+bytes; control) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| bch-groth16-singleton:valid | 38/56 | 26/5 | - | - | 2/19 | 9/11 | - | - | 21/9 | 4/0 | - | 1.929; -; -; 1.084; 6.715 |
| bch-groth16-singleton:invalid | 39/56 | 26/5 | - | - | 3/19 | 9/11 | - | - | 22/9 | 2/0 | - | 1.743; -; -; 0.968; 6.258 |
| bch-groth16-singleton-opcode-optimized:valid | 38/54 | 25/5 | - | - | 3/19 | 10/12 | - | - | 22/9 | 2/0 | - | 1.786; -; -; 1.038; 5.941 |
| bch-groth16-singleton-opcode-optimized:invalid | 37/54 | 25/5 | - | - | 4/19 | 11/12 | - | - | 21/9 | 3/0 | - | 1.838; -; -; 1.294; 5.995 |
| bch-groth16-singleton-genpow:valid | 45/61 | 15/3 | - | - | 3/17 | 10/10 | - | - | 23/9 | 4/0 | - | 1.751; -; -; 1.178; 5.900 |
| bch-groth16-singleton-genpow:invalid | 47/61 | 16/3 | - | - | 3/17 | 10/10 | - | - | 22/9 | 2/0 | - | 1.759; -; -; 1.071; 5.507 |
| bch-groth16-singleton-minop:valid | 28/47 | 50/15 | - | - | 3/15 | 14/23 | 0/0 | - | 4/1 | 2/0 | - | 2.483; -; -; 1.843; 24.363 |
| bch-groth16-singleton-minop:invalid | 27/48 | 49/15 | - | - | 3/15 | 13/22 | 2/0 | - | 4/1 | 2/0 | - | 2.342; -; -; 1.964; 24.002 |
| bch-groth16-bls12381-singleton:valid | 41/70 | 27/4 | - | - | 3/12 | 10/9 | - | - | 17/5 | 3/0 | - | 1.146; -; -; 1.180; 6.161 |
| bch-groth16-bls12381-singleton:invalid | 42/70 | 28/4 | - | - | 2/12 | 10/9 | - | - | 17/5 | 2/0 | - | 1.126; -; -; 1.100; 6.036 |
| bch-groth16-bls12381-singleton-opcode-optimized:valid | 40/69 | 28/4 | - | - | 3/12 | 9/9 | - | - | 17/6 | 3/0 | - | 1.143; -; -; 1.133; 5.850 |
| bch-groth16-bls12381-singleton-opcode-optimized:invalid | 40/69 | 27/4 | - | - | 3/12 | 10/9 | - | - | 17/6 | 3/0 | - | 1.164; -; -; 1.206; 5.878 |
| bch-groth16-bls12381-singleton-genpow:valid | 52/68 | 31/9 | - | - | 1/7 | 6/12 | - | - | 7/4 | 3/0 | - | 2.450; -; -; 1.212; 6.582 |
| bch-groth16-bls12381-singleton-genpow:invalid | 52/68 | 31/9 | - | - | 1/7 | 6/12 | - | - | 7/4 | 2/0 | - | 2.513; -; -; 1.220; 6.586 |
| bch-groth16-bls12381-singleton-minop:valid | 30/60 | 45/9 | - | - | 2/12 | 14/17 | 0/0 | - | 6/2 | 3/0 | - | 1.441; -; -; 1.669; 9.545 |
| bch-groth16-bls12381-singleton-minop:invalid | 31/60 | 45/9 | - | - | 2/12 | 14/17 | 0/0 | - | 5/2 | 2/0 | - | 1.481; -; -; 1.567; 8.292 |
| bch-groth16-sound-si-gls-single:valid | 27/61 | 23/7 | 1/0 | - | 2/10 | 12/19 | 3/2 | - | 10/1 | 22/0 | - | 2.606; 59.272; -; 3.178; 53.578 |
| bch-groth16-sound-si-gls-single:invalid | 22/61 | 26/7 | 1/0 | - | 3/10 | 15/19 | 5/2 | - | 3/1 | 26/0 | - | 1.966; 35.477; -; 3.889; 15.955 |
| bch-groth16-bls12381-sound-si-gls-single:valid | 33/71 | 23/6 | 2/0 | - | 3/7 | 12/13 | 5/2 | - | 8/1 | 15/0 | - | 1.698; 61.447; -; 3.278; 30.937 |
| bch-groth16-bls12381-sound-si-gls-single:invalid | 22/71 | 23/6 | 0/0 | - | 3/7 | 17/13 | 2/2 | - | 5/1 | 26/0 | - | 1.551; 16.768; -; 5.144; 25.700 |
| bch-groth16-bn254-sound-native:valid | 41/58 | 27/6 | 0/0 | - | 5/11 | 14/18 | 4/4 | 0/1 | 5/1 | 3/0 | - | 2.929; 6.492; -; 2.962; 15.397 |
| bch-groth16-bn254-sound-native:invalid | 35/57 | 21/6 | 1/0 | - | 1/11 | 16/18 | 5/5 | 0/1 | 16/2 | 5/0 | - | 2.270; 6.526; -; 2.369; 39.716 |
| bch-groth16-bls12381-sound-native:valid | 29/67 | 27/6 | 0/0 | - | 2/8 | 20/13 | 4/4 | 0/1 | 6/1 | 12/0 | - | 1.436; 6.324; -; 3.516; 24.296 |
| bch-groth16-bls12381-sound-native:invalid | 29/68 | 36/6 | 1/0 | - | 5/7 | 12/13 | 5/4 | 0/1 | 10/1 | 2/0 | - | 1.554; 6.597; -; 3.347; 53.732 |
| lx24w3 | - | - | 13/0 | 49/44 | 0/1 | 0/0 | 37/54 | - | - | 1/0 | - | -; 1,680.073; 61.544; 37.233; - |
| 8qnlgt | - | 88/18 | 1/1 | 10/77 | 0/2 | 0/1 | 0/0 | - | - | 0/0 | - | -; 101.968; 6.717; 14.336; - |
| 4r9wdp | - | 47/0 | 1/0 | 12/33 | 11/1 | 0/13 | 28/52 | - | - | 1/0 | - | -; 98.371; 9.139; 15.625; - |
| e2knc8 | - | 59/0 | 3/0 | 21/45 | 1/2 | 0/0 | 15/52 | - | - | 1/0 | - | -; 108.024; 6.038; 3.967; - |
| 7s4l4d | - | 86/71 | 1/2 | - | 0/2 | 12/25 | 0/0 | - | - | 1/0 | - | -; 63.368; -; 68.924; - |
| wjg8aj | - | 26/71 | 1/2 | - | 0/2 | 69/25 | 0/0 | - | - | 3/0 | - | -; 30.920; -; 145.824; - |
| wc6z2q | - | 68/69 | 7/2 | - | 2/2 | 13/26 | 1/0 | - | - | 9/0 | - | -; 64.350; -; 10.518; - |
| 3z4fuw | - | 29/69 | 1/2 | - | 1/2 | 65/26 | 0/0 | - | - | 4/0 | - | -; 32.009; -; 108.450; - |
| 479864 | - | 69/70 | 6/2 | - | 1/3 | 14/25 | 1/0 | - | - | 9/0 | - | -; 59.636; -; 10.632; - |
| pp6twr | - | 32/70 | 1/2 | - | 1/3 | 61/25 | 0/0 | - | - | 4/0 | - | -; 29.192; -; 90.285; - |
| des0rv | - | 96/39 | 1/0 | - | 0/1 | 0/20 | 3/40 | - | - | 0/0 | - | -; 106.492; -; 3.651; - |
| xg7206 | - | 98/39 | 0/1 | - | 0/1 | 0/20 | 1/40 | - | - | 0/0 | - | -; 51.558; -; 1.964; - |
| v8lscg | - | 98/39 | 1/0 | - | 0/1 | 0/20 | 1/40 | - | - | 0/0 | - | -; 110.980; -; 1.774; - |
| 2xhecr | - | 93/39 | 0/1 | - | 0/1 | 0/20 | 6/40 | - | - | 0/0 | - | -; 50.750; -; 11.674; - |
| y54lkh | - | 97/32 | 2/0 | - | 0/1 | 0/34 | 1/34 | - | - | 0/0 | - | -; 194.198; -; 0.965; - |
| 9vkccn | - | 98/32 | 0/0 | - | 0/1 | 0/34 | 1/34 | - | - | 0/0 | - | -; 54.488; -; 1.016; - |
| 53s3xu | - | 89/1 | 3/1 | - | 1/1 | 2/49 | 3/49 | - | - | 1/0 | - | -; 94.935; -; 1.128; - |
| f7qhsg | - | 98/37 | 0/1 | - | 0/1 | 0/21 | 0/40 | - | - | 0/0 | - | -; 87.181; -; 1.261; - |
| 09macl | - | 92/65 | 0/0 | - | 0/0 | 1/33 | 6/1 | - | - | 1/0 | - | -; 72.122; -; 9.452; - |
| mzgxue | 60/58 | 14/15 | 5/2 | - | 1/3 | 10/23 | 1/0 | - | - | 8/0 | - | 20.647; 52.302; -; 9.581; - |
| cps57g | 59/58 | 15/15 | 3/2 | - | 1/3 | 12/23 | 1/0 | - | - | 9/0 | - | 19.788; 31.805; -; 10.993; - |
| xyd798 | 59/60 | 16/14 | 4/2 | - | 1/2 | 11/22 | 1/0 | - | - | 8/0 | - | 17.792; 48.386; -; 9.300; - |
| djc9j4 | 51/60 | 14/14 | 2/2 | - | 1/2 | 24/22 | 1/0 | - | - | 7/0 | - | 18.897; 29.770; -; 23.017; - |
| cg58ck | 98/47 | - | 1/0 | - | 0/1 | 0/18 | 1/34 | - | - | 0/0 | - | 158.835; 89.605; -; 1.295; - |
| 4wrejp | 82/23 | 1/0 | 6/1 | - | 2/1 | 2/26 | 6/49 | - | - | 3/0 | - | 37.879; 86.048; -; 1.360; - |
| v6gq6s | 25/23 | 0/0 | 1/1 | - | 1/1 | 1/26 | 71/49 | - | - | 1/0 | - | 37.606; 48.515; -; 32.474; - |
| khn0me | 90/73 | - | 3/0 | - | 1/1 | 2/10 | 3/17 | - | - | 1/0 | - | 15.668; 84.556; -; 2.454; - |
| ydc5f4 | 84/73 | - | 10/0 | - | 1/1 | 1/10 | 2/17 | - | - | 1/0 | - | 15.554; 286.158; -; 2.345; - |
| 8h53rn | 7/79 | 0/0 | 5/1 | - | 1/1 | 2/7 | 83/12 | - | - | 2/0 | - | 0.916; 85.242; -; 46.052; - |
| tfj2qe | 32/79 | 2/0 | 17/1 | - | 8/1 | 9/7 | 20/12 | - | - | 12/0 | - | 0.917; 63.312; -; 4.006; - |
| ptzjns | 20/85 | 2/0 | 29/1 | - | 8/1 | 7/5 | 22/8 | - | - | 11/0 | - | 0.469; 90.294; -; 5.335; - |
| 0p0kn7 | 23/85 | 2/0 | 20/1 | - | 9/1 | 12/5 | 23/8 | - | - | 12/0 | - | 0.460; 50.788; -; 5.522; - |
| p4hnrn | 2/89 | 0/0 | 3/1 | - | 6/1 | 1/4 | 88/5 | - | - | 1/0 | - | 0.433; 99.988; -; 234.786; - |
| 398646 | 20/89 | 3/0 | 23/1 | - | 12/1 | 7/4 | 24/5 | - | - | 13/0 | - | 0.366; 54.877; -; 7.308; - |
| 0qyjxr | 14/92 | 15/0 | 31/1 | - | 8/1 | 5/3 | 17/3 | - | - | 9/0 | - | 0.326; 91.056; -; 8.630; - |
| xp2mgv | 17/92 | 2/0 | 23/1 | - | 9/1 | 9/3 | 27/3 | - | - | 12/0 | - | 0.313; 52.523; -; 10.068; - |
| 8zk9rg | 15/92 | 2/0 | 30/1 | - | 9/1 | 8/3 | 24/3 | - | - | 11/0 | - | 0.253; 83.746; -; 8.709; - |
| zyrc2f | 10/96 | - | 29/1 | - | 15/1 | 2/1 | 38/2 | - | - | 7/0 | - | 0.210; 93.484; -; 31.351; - |
| wa3e5m | 24/96 | - | 20/1 | - | 10/1 | 4/1 | 34/2 | - | - | 8/0 | - | 0.397; 49.631; -; 21.414; - |
| ly54y8 | 97/59 | - | 1/1 | - | 0/1 | - | 2/40 | - | - | 0/0 | - | 116.592; 86.089; -; 2.955; - |
| 90e2p7 | 97/58 | - | 1/1 | - | 0/1 | - | 2/40 | - | - | 0/0 | - | 91.528; 48.477; -; 3.160; - |
| jlc8j2 | 78/23 | - | 10/1 | - | 2/1 | 2/26 | 5/49 | - | - | 2/0 | - | 35.317; 148.907; -; 1.309; - |
| jp2gew | 81/23 | - | 6/1 | - | 2/1 | 3/26 | 5/49 | - | - | 3/0 | - | 36.120; 89.363; -; 1.336; - |
| lthl39 | 30/23 | - | 1/1 | - | 1/1 | 1/26 | 66/49 | - | - | 1/0 | - | 38.166; 52.519; -; 25.660; - |
| 8mk9lv | 41/68 | - | 9/1 | - | 2/1 | 35/11 | 9/19 | - | - | 4/0 | - | 2.751; 83.907; -; 6.695; - |
| ees8ps | 58/68 | - | 10/1 | - | 4/1 | 6/11 | 15/19 | - | - | 7/0 | - | 2.416; 52.792; -; 2.324; - |
| gmd96n | 37/79 | - | 22/1 | - | 6/1 | 5/7 | 23/12 | - | - | 8/0 | - | 1.189; 93.242; -; 4.284; - |
| j87vmt | 35/79 | - | 17/1 | - | 7/1 | 9/7 | 23/12 | - | - | 10/0 | - | 0.894; 55.527; -; 3.873; - |
| yfqvz4 | 21/86 | - | 29/1 | - | 8/1 | 11/5 | 21/8 | - | - | 10/0 | - | 0.484; 86.169; -; 5.694; - |
| pj67rn | 25/86 | - | 20/1 | - | 9/1 | 9/5 | 25/8 | - | - | 11/0 | - | 0.494; 49.169; -; 5.422; - |
| 06368y | 18/90 | - | 30/1 | - | 8/1 | 7/4 | 27/5 | - | - | 10/0 | - | 0.431; 93.565; -; 9.289; - |
| kpuh7h | 23/90 | - | 22/1 | - | 10/1 | 7/4 | 26/5 | - | - | 12/0 | - | 0.432; 52.212; -; 7.258; - |
| a0jeux | 20/92 | - | 27/1 | - | 23/1 | 5/3 | 16/3 | - | - | 9/0 | - | 0.483; 87.625; -; 13.560; - |
| 8y2whd | 28/92 | - | 22/1 | - | 10/1 | 8/3 | 20/3 | - | - | 12/0 | - | 0.508; 50.596; -; 8.921; - |
| c0rm8d | 90/92 | - | 4/1 | - | 1/1 | 1/3 | 3/3 | - | - | 1/0 | - | 13.196; 89.605; -; 8.920; - |
| lnwaz3 | 11/96 | 2/0 | 29/1 | - | 8/1 | 1/1 | 41/2 | - | - | 8/0 | - | 0.212; 87.746; -; 26.488; - |
| p2c47w | 12/96 | 13/0 | 18/1 | - | 8/1 | 3/1 | 38/2 | - | - | 9/0 | - | 0.220; 49.635; -; 24.843; - |
| wx3f79 | 74/49 | - | 7/1 | - | 2/1 | - | 15/49 | - | - | 2/0 | - | 11.264; 88.875; -; 2.440; - |
| u83yzg | 76/49 | - | 4/1 | - | 2/1 | - | 16/49 | - | - | 2/0 | - | 11.891; 52.292; -; 2.676; - |
| swae3w | 32/70 | - | 1/2 | - | 1/5 | 66/23 | 0/0 | - | - | 1/0 | - | 57.868; 53.009; -; 308.516; - |
| qhx767 | 73/70 | - | 3/2 | - | 2/5 | 12/23 | 1/0 | - | - | 8/0 | - | 21.269; 36.642; -; 11.043; - |
| ps2qy8 | 97/47 | - | 1/0 | - | 0/1 | 0/18 | 1/34 | - | - | 0/0 | - | 103.226; 93.887; -; 1.344; - |
| fd2aev | 99/47 | - | 0/0 | - | 0/1 | 0/18 | 0/34 | - | - | 0/0 | - | 161.223; 50.246; -; 1.299; - |
| q6znzv | 97/47 | - | 1/0 | - | 0/1 | 0/18 | 2/34 | - | - | 0/0 | - | 125.789; 85.927; -; 2.738; - |
| y3rkt0 | 98/47 | - | 0/0 | - | 0/1 | 0/18 | 1/34 | - | - | 0/0 | - | 143.312; 53.869; -; 1.221; - |
| g2d82f | 89/73 | - | 3/0 | - | 3/1 | 1/10 | 2/17 | - | - | 1/0 | - | 15.675; 93.887; -; 3.042; - |
| 5f3496 | 90/73 | - | 2/0 | - | 1/1 | 1/10 | 5/17 | - | - | 1/0 | - | 15.614; 49.785; -; 3.217; - |
| 468t4m | 78/81 | - | 8/1 | - | 2/1 | 2/7 | 7/11 | - | - | 3/0 | - | 5.593; 87.831; -; 3.491; - |
| vf0t0g | 80/81 | - | 5/1 | - | 3/1 | 2/7 | 7/11 | - | - | 3/0 | - | 5.459; 51.942; -; 3.469; - |
| dt9vcn | 58/86 | - | 15/1 | - | 5/1 | 5/5 | 12/7 | - | - | 6/0 | - | 2.398; 86.331; -; 5.854; - |
| 5gruzp | 54/86 | - | 10/1 | - | 5/1 | 8/5 | 17/7 | - | - | 6/0 | - | 2.275; 56.800; -; 8.335; - |
| kycymh | 22/90 | - | 11/1 | - | 52/1 | 2/4 | 8/5 | - | - | 4/0 | - | 1.162; 78.456; -; 31.179; - |
| 5vfk64 | 47/90 | - | 15/1 | - | 7/1 | 5/4 | 18/5 | - | - | 8/0 | - | 1.161; 49.788; -; 7.111; - |
| mqttrf | 34/92 | - | 24/1 | - | 9/1 | 7/3 | 18/3 | - | - | 9/0 | - | 0.811; 79.181; -; 10.081; - |
| rehnu5 | 37/92 | - | 18/1 | - | 9/1 | 9/3 | 17/3 | - | - | 9/0 | - | 0.827; 52.754; -; 10.106; - |
| cgkp7j | 32/92 | - | 19/1 | - | 7/1 | 6/3 | 29/3 | - | - | 8/0 | - | 0.729; 74.456; -; 12.597; - |
| pf86u7 | 39/92 | - | 16/1 | - | 8/1 | 7/3 | 20/3 | - | - | 10/0 | - | 0.776; 51.715; -; 9.395; - |
| pg83j6 | 27/96 | - | 19/1 | - | 21/1 | 1/1 | 25/2 | - | - | 6/0 | - | 0.693; 76.073; -; 32.118; - |
| 8t6h2y | 34/96 | - | 18/1 | - | 12/1 | 3/1 | 26/2 | - | - | 8/0 | - | 0.679; 52.869; -; 21.934; - |
| s8czyv | 97/59 | - | 1/1 | - | 0/1 | - | 2/40 | - | - | 0/0 | - | 95.164; 81.040; -; 3.033; - |
| fwtkxa | 97/58 | - | 1/1 | - | 0/1 | - | 2/40 | - | - | 0/0 | - | 87.880; 50.288; -; 2.864; - |
| gwvyrp | 97/59 | - | 1/1 | - | 1/1 | - | 2/40 | - | - | 0/0 | - | 107.858; 79.060; -; 3.724; - |
| dpaptk | 97/58 | - | 0/1 | - | 0/1 | - | 2/40 | - | - | 0/0 | - | 111.710; 52.058; -; 2.991; - |
| trxhzt | - | - | 4/1 | 93/97 | 1/2 | 0/0 | 1/0 | - | - | 1/0 | - | -; 62.901; 15.449; 14.356; - |
| pxknd8 | - | - | 1/0 | - | 0/0 | 5/47 | 92/53 | - | - | 2/0 | - | -; 45.220; -; 12.469; - |
| cmayp9 | - | - | 1/0 | - | 1/0 | 7/47 | 88/53 | - | - | 3/0 | - | -; 31.985; -; 7.077; - |
| wg648r | - | - | 1/0 | - | 0/0 | 4/47 | 93/53 | - | - | 2/0 | - | -; 43.834; -; 14.171; - |
| 2tmhns | - | - | 1/0 | - | 1/0 | 10/47 | 84/53 | - | - | 4/0 | - | -; 28.571; -; 5.713; - |
| vyfs9e | - | - | 1/0 | - | 0/0 | 45/47 | 52/52 | - | - | 2/0 | - | -; 42.605; -; 12.303; - |
| desctt | - | - | 1/0 | - | 1/0 | 9/47 | 85/52 | - | - | 4/0 | - | -; 32.695; -; 6.207; - |
| 4wm0d3 | - | - | 9/1 | - | 3/1 | 2/33 | 84/65 | - | - | 2/0 | - | -; 69.085; -; 5.501; - |
| 7lm98w | - | - | 5/1 | - | 3/1 | 1/32 | 89/65 | - | - | 2/0 | - | -; 46.165; -; 6.742; - |
| ayavrh | - | - | 8/1 | - | 3/1 | 1/33 | 86/65 | - | - | 2/0 | - | -; 76.355; -; 6.890; - |
| u57mex | - | - | 2/1 | - | 1/1 | 1/32 | 95/65 | - | - | 1/0 | - | -; 48.746; -; 19.145; - |
| 4g330z | - | - | 0/0 | - | 0/0 | 21/47 | 73/53 | - | - | 6/0 | - | -; 14.378; -; 4.652; - |
| gjj3m6 | - | - | 0/0 | - | 0/0 | 19/47 | 73/53 | - | - | 8/0 | - | -; 11.004; -; 4.539; - |
| pzkpz6 | - | - | 0/0 | - | 0/0 | 11/47 | 83/53 | - | - | 6/0 | - | -; 14.167; -; 4.856; - |
| vy8dax | - | - | 0/0 | - | 0/0 | 8/47 | 90/53 | - | - | 1/0 | - | -; 10.477; -; 6.449; - |
| mtwr0s | - | - | 0/0 | - | 0/0 | 14/47 | 81/53 | - | - | 5/0 | - | -; 14.773; -; 4.118; - |
| ny933k | - | - | 0/0 | - | 0/0 | 21/47 | 73/53 | - | - | 5/0 | - | -; 10.881; -; 4.237; - |
| rdn5u2 | - | - | 3/0 | - | 1/0 | 29/90 | 59/9 | - | - | 7/0 | - | -; 42.011; -; 3.508; - |
| 630nga | - | - | 0/0 | - | 0/0 | 5/90 | 94/9 | - | - | 1/0 | - | -; 32.739; -; 25.291; - |
| f8q8qr | - | - | 85/47 | - | 3/7 | - | 10/46 | - | - | 2/0 | - | -; 102.694; -; 14.338; - |
| z83vh9 | - | - | 62/47 | - | 8/12 | - | 24/42 | - | - | 6/0 | - | -; 28.857; -; 12.952; - |
| 9susd7 | - | - | 60/47 | - | 9/12 | - | 25/42 | - | - | 6/0 | - | -; 28.668; -; 14.289; - |
| hfmhj6 | - | - | 60/48 | - | 8/6 | - | 26/45 | - | - | 6/0 | - | -; 29.506; -; 15.508; - |
| 3ptmtc | - | - | 14/48 | - | 2/11 | - | 83/41 | - | - | 1/0 | - | -; 32.059; -; 178.066; - |
| weeulq | - | - | 58/48 | - | 8/12 | - | 28/41 | - | - | 5/0 | - | -; 30.332; -; 17.292; - |
| paj8qc | - | - | 56/47 | - | 10/6 | - | 28/46 | - | - | 6/0 | - | -; 26.798; -; 16.329; - |
| 30eyuf | - | - | 62/47 | - | 9/11 | - | 24/42 | - | - | 6/0 | - | -; 27.902; -; 12.730; - |
| gh9dl6 | - | - | 63/47 | - | 8/11 | - | 23/42 | - | - | 6/0 | - | -; 29.681; -; 13.054; - |
| wrtsdg | - | - | 58/47 | - | 1/7 | - | 40/46 | - | - | 1/0 | - | -; 309.738; -; 193.412; - |
| 32x702 | - | - | 65/47 | - | 9/12 | - | 21/42 | - | - | 6/0 | - | -; 33.433; -; 13.319; - |
| 6w82jc | - | - | 62/47 | - | 9/12 | - | 23/42 | - | - | 6/0 | - | -; 28.645; -; 12.508; - |
| cwk8s3 | - | - | 58/48 | - | 9/6 | - | 27/45 | - | - | 6/0 | - | -; 28.129; -; 16.162; - |
| admadu | - | - | 66/48 | - | 8/11 | - | 21/41 | - | - | 6/0 | - | -; 33.046; -; 13.034; - |
| plnxr5 | - | - | 53/48 | - | 21/12 | - | 21/41 | - | - | 5/0 | - | -; 29.020; -; 21.018; - |
| pr4pzg | - | - | 59/47 | - | 9/6 | - | 26/46 | - | - | 6/0 | - | -; 27.808; -; 14.952; - |
| hk95ge | - | - | 65/47 | - | 8/11 | - | 21/42 | - | - | 6/0 | - | -; 32.234; -; 12.711; - |
| jwexpz | - | - | 63/47 | - | 8/11 | - | 23/42 | - | - | 6/0 | - | -; 30.584; -; 13.251; - |
| 4tt8x6 | - | - | 35/47 | - | 13/7 | - | 44/46 | - | - | 9/0 | - | -; 11.411; -; 16.638; - |
| qsytu9 | - | - | 94/47 | - | 1/12 | - | 3/42 | - | - | 1/0 | - | -; 313.813; -; 13.958; - |
| q8hvd6 | - | - | 40/47 | - | 15/12 | - | 36/41 | - | - | 9/0 | - | -; 13.043; -; 14.549; - |
| mc3nlk | - | - | 36/48 | - | 13/6 | - | 42/45 | - | - | 10/0 | - | -; 11.158; -; 16.059; - |
| h5yvem | - | - | 44/48 | - | 10/11 | - | 38/41 | - | - | 8/0 | - | -; 16.323; -; 16.336; - |
| 50c7jl | - | - | 44/48 | - | 12/12 | - | 35/41 | - | - | 8/0 | - | -; 14.299; -; 14.211; - |
| t77tn5 | - | - | 31/48 | - | 13/6 | - | 48/46 | - | - | 8/0 | - | -; 11.275; -; 19.778; - |
| jf95ck | - | - | 46/47 | - | 13/11 | - | 33/42 | - | - | 8/0 | - | -; 16.015; -; 13.908; - |
| r3axym | - | - | 43/47 | - | 14/11 | - | 34/42 | - | - | 10/0 | - | -; 12.346; -; 12.065; - |
| ua7859 | - | - | 45/48 | - | 11/6 | - | 35/45 | - | - | 8/0 | - | -; 16.170; -; 15.733; - |
| rnnrg8 | - | - | 48/48 | - | 11/11 | - | 32/41 | - | - | 8/0 | - | -; 17.008; -; 13.704; - |
| rjd8aj | - | - | 56/48 | - | 12/12 | - | 26/41 | - | - | 7/0 | - | -; 21.814; -; 13.355; - |
| kfrw39 | - | - | 40/48 | - | 14/6 | - | 38/45 | - | - | 8/0 | - | -; 12.823; -; 15.769; - |
| djk4vz | - | - | 48/48 | - | 12/11 | - | 32/41 | - | - | 8/0 | - | -; 16.922; -; 13.739; - |
| 7ap9wf | - | - | 41/48 | - | 13/12 | - | 36/41 | - | - | 10/0 | - | -; 12.997; -; 13.999; - |
| uuz4z3 | - | - | 6/0 | - | 5/1 | 72/98 | 5/0 | - | - | 13/0 | - | -; 43.173; -; 1.809; - |
| wfd0jv | - | - | 5/0 | - | 3/1 | 72/98 | 6/0 | - | - | 14/0 | - | -; 31.697; -; 1.679; - |
| 2h5x79 | - | - | 1/0 | - | 32/2 | 65/97 | 1/0 | - | - | 2/0 | - | -; 39.639; -; 17.173; - |
| aqa938 | - | - | 5/0 | - | 4/2 | 69/97 | 5/0 | - | - | 16/0 | - | -; 25.961; -; 1.474; - |
| 64h7ly | - | - | 1/0 | - | 14/5 | 83/94 | 1/0 | - | - | 2/0 | - | -; 33.767; -; 17.368; - |
| 23tlfd | - | - | 1/0 | - | 18/5 | 77/94 | 1/0 | - | - | 3/0 | - | -; 24.689; -; 11.541; - |
| se6qet | - | - | 1/0 | 13/1 | 6/9 | 33/89 | 0/0 | - | - | 47/0 | - | -; 14.242; 125.642; 4.666; - |
| ap38fd | - | - | 1/0 | 3/1 | 3/9 | 23/89 | 0/0 | - | - | 71/0 | - | -; 10.999; 22.807; 2.587; - |
| xuxr6e | - | - | - | 98/99 | 1/1 | - | - | - | - | 1/0 | - | -; -; 8.107; 9.780; - |
| l0fhm3 | - | - | - | 100/99 | 0/1 | - | - | - | - | 0/0 | - | -; -; 73.017; 2.611; - |
| c4chnz | - | - | - | 98/99 | 2/1 | - | - | - | - | 1/0 | - | -; -; 1.963; 3.333; - |
| vzvufa | - | - | - | 100/99 | 0/1 | - | - | - | - | 0/0 | - | -; -; 24.713; 0.884; - |
| 0r7ngd | - | - | - | 98/97 | 1/3 | - | - | - | - | 0/0 | - | -; -; 10.516; 4.632; - |
| d5rw9l | - | - | - | 100/97 | 0/3 | - | - | - | - | 0/0 | - | -; -; 76.223; 1.601; - |
| 49mkxm | - | - | - | 98/99 | 1/1 | - | - | - | - | 1/0 | - | -; -; 5.161; 6.386; - |
| t0z6jt | - | - | - | 100/99 | 0/1 | - | - | - | - | 0/0 | - | -; -; 49.488; 5.085; - |
| plq235 | - | - | - | 98/99 | 2/1 | - | - | - | - | 0/0 | - | -; -; 5.580; 10.444; - |
| 30mvm8 | - | - | - | 100/99 | 0/1 | - | - | - | - | 0/0 | - | -; -; 48.135; 1.847; - |
| vx8cqv | - | - | 9/1 | 79/97 | 4/2 | 1/0 | 3/0 | - | - | 3/0 | - | -; 64.843; 5.126; 22.883; - |
| 99mssa | - | - | 1/1 | 99/97 | 0/2 | 0/0 | 0/0 | - | - | 0/0 | - | -; 17.382; 32.335; 5.986; - |
| jyqemh | - | - | 7/1 | 84/97 | 3/2 | 1/0 | 3/0 | - | - | 2/0 | - | -; 51.226; 5.426; 16.193; - |
| p406sl | - | - | 1/1 | 99/97 | 0/2 | 0/0 | 0/0 | - | - | 0/0 | - | -; 28.429; 32.217; 5.784; - |
| 35f8yl | - | - | 1/0 | - | 18/0 | 77/99 | 1/0 | - | - | 3/0 | - | -; 35.861; -; 8.015; - |
| p7aeva | - | - | 4/0 | - | 1/1 | 77/99 | 6/0 | - | - | 12/0 | - | -; 20.814; -; 1.569; - |
| x4ddtw | - | - | 1/0 | - | 1/2 | 95/98 | 0/0 | - | - | 3/0 | - | -; 31.173; -; 8.248; - |
| y05lce | - | - | 3/0 | - | 39/2 | 48/98 | 1/0 | - | - | 10/0 | - | -; 26.398; -; 2.593; - |
| 3ne030 | - | - | 20/1 | - | 11/1 | 9/74 | 51/25 | - | - | 8/0 | - | -; 108.028; -; 2.357; - |
| 7z9hne | - | - | 14/1 | - | 10/1 | 8/74 | 59/25 | - | - | 8/0 | - | -; 36.996; -; 1.266; - |
| 9p30lt | - | - | 21/0 | - | 11/1 | 18/35 | 35/64 | - | - | 15/0 | - | -; 54.581; -; 0.715; - |
| ss72kv | - | 81/72 | 0/1 | 1/3 | 1/4 | 13/20 | 0/0 | - | - | 4/0 | - | -; 11.494; 23.971; 25.273; - |
| l0acpe | - | 85/72 | 0/1 | 2/3 | 0/4 | 7/20 | 0/0 | - | - | 6/0 | - | -; 8.726; 19.913; 8.059; - |
| 8zmhnl | - | 21/19 | 1/1 | - | 0/1 | 62/79 | 0/0 | - | - | 15/0 | - | -; 12.762; -; 7.682; - |
| xxy89j | - | 47/19 | 1/1 | - | 0/1 | 41/79 | 0/0 | - | - | 12/0 | - | -; 9.637; -; 8.248; - |
| a3ujmu | - | 64/58 | 0/1 | 2/3 | 0/4 | 17/22 | 0/0 | - | 14/12 | 2/0 | - | -; 10.344; 22.972; 21.614; 39.151 |
| 5sxtzw | - | 66/58 | 1/1 | 5/3 | 1/4 | 18/22 | 0/0 | - | 3/12 | 5/0 | - | -; 9.135; 19.618; 8.416; 2.838 |
| g2qj8r | - | - | 1/1 | - | 0/1 | 8/14 | 0/0 | - | 69/83 | 22/0 | - | -; 11.504; -; 8.780; 13.427 |
| xqlhvr | - | - | 1/1 | - | 0/1 | 10/14 | 0/0 | - | 77/83 | 12/0 | - | -; 8.893; -; 8.318; 11.642 |
| w6v3jd | - | - | 1/1 | - | 0/1 | 1/2 | 0/0 | - | 3/96 | 95/0 | - | -; 10.892; -; 8.114; 0.645 |
| 5pvlyk | - | - | 1/1 | - | 1/1 | 43/2 | 0/0 | - | 35/96 | 20/0 | - | -; 9.561; -; 106.501; 3.010 |
| u33zrd | - | 48/74 | - | - | 0/0 | 48/26 | - | - | - | 3/0 | - | -; -; -; 61.651; - |
| vd72vn | - | 83/72 | - | - | 0/0 | 17/27 | - | - | - | 0/0 | - | -; -; -; 106.233; - |
| nsw96e | 62/60 | 16/15 | - | - | 1/1 | 12/24 | - | - | - | 9/0 | - | 19.340; -; -; 9.804; - |
| deq7jk | 28/62 | 7/15 | - | - | 1/1 | 60/23 | - | - | - | 4/0 | - | 19.477; -; -; 110.951; - |
| snngzt | 54/73 | - | - | - | 0/3 | 43/24 | - | - | - | 3/0 | - | 44.881; -; -; 100.224; - |
| gf8rlx | - | - | 30/49 | - | 5/8 | 0/0 | 61/43 | - | - | 4/0 | - | -; 3.654; -; 7.708; - |
| 4u6jsk | - | - | 36/49 | - | 3/8 | 0/0 | 58/43 | - | - | 4/0 | - | -; 4.271; -; 6.949; - |
| 3y7jmz | - | - | 42/49 | - | 1/8 | 0/0 | 55/43 | - | - | 1/0 | - | -; 5.372; -; 6.829; - |
| 3kftnk | - | - | 37/49 | - | 4/8 | 0/0 | 57/43 | - | - | 2/0 | - | -; 4.718; -; 7.408; - |
| jallhq | - | - | 38/49 | - | 1/8 | 0/0 | 58/43 | - | - | 2/0 | - | -; 5.271; -; 8.029; - |
| mws83a | - | - | 40/49 | - | 1/8 | 0/0 | 58/43 | - | - | 1/0 | - | -; 5.123; -; 7.354; - |
| 0ns36s | - | - | 47/51 | - | 2/7 | 0/0 | 49/41 | - | - | 2/0 | - | -; 6.282; -; 7.142; - |
| 7r6evv | - | - | 43/51 | - | 2/7 | 0/0 | 54/41 | - | - | 2/0 | - | -; 5.712; -; 7.830; - |
| pmk7we | - | - | 45/52 | - | 1/7 | 0/0 | 53/41 | - | - | 1/0 | - | -; 5.823; -; 7.473; - |
| maydtv | - | - | 45/52 | - | 2/7 | 0/0 | 52/41 | - | - | 1/0 | - | -; 6.018; -; 7.698; - |
| nhzssk | - | - | 62/38 | - | 0/0 | 14/28 | 20/33 | - | - | 3/0 | - | -; 3.224; -; 1.108; - |
| 7w3kz4 | - | - | 69/38 | - | 2/0 | 13/28 | 15/33 | - | - | 2/0 | - | -; 3.125; -; 0.834; - |
| j6nl2n | - | - | 73/38 | - | 1/0 | 7/28 | 14/33 | - | - | 5/0 | - | -; 4.561; -; 0.835; - |
| d53dwe | - | - | 70/38 | - | 0/0 | 9/28 | 15/33 | - | - | 5/0 | - | -; 4.809; -; 1.058; - |
| z9y43g | - | - | 79/38 | - | 0/0 | 7/28 | 11/33 | - | - | 3/0 | - | -; 5.127; -; 0.729; - |
| ta05ww | - | - | 76/38 | - | 0/0 | 9/28 | 13/33 | - | - | 2/0 | - | -; 5.163; -; 0.923; - |
| n0yzej | - | - | 74/40 | - | 0/0 | 8/27 | 15/32 | - | - | 3/0 | - | -; 6.010; -; 1.303; - |
| 7tq2sl | - | - | 80/40 | - | 0/0 | 8/27 | 10/32 | - | - | 2/0 | - | -; 5.361; -; 0.800; - |
| lcennk | - | - | 80/40 | - | 0/0 | 7/27 | 10/32 | - | - | 2/0 | - | -; 5.757; -; 0.876; - |
| ntcrvp | - | - | 77/40 | - | 0/0 | 8/27 | 12/32 | - | - | 3/0 | - | -; 5.623; -; 0.991; - |
| yxrclk | - | - | 6/49 | - | 0/8 | 0/0 | 93/43 | - | - | 0/0 | - | -; 3.454; -; 49.457; - |
| 83v867 | - | - | 4/49 | - | 1/8 | 0/0 | 94/43 | - | - | 1/0 | - | -; 3.496; -; 72.626; - |
| 0uk59w | - | - | 39/49 | - | 1/8 | 0/0 | 58/43 | - | - | 2/0 | - | -; 21.204; -; 30.824; - |
| q5mn2f | - | - | 9/49 | - | 1/8 | 0/0 | 89/43 | - | - | 2/0 | - | -; 4.984; -; 49.366; - |
| xvg04z | - | - | 9/49 | - | 1/8 | 0/0 | 89/43 | - | - | 1/0 | - | -; 5.665; -; 56.044; - |
| k7ar59 | - | - | 78/49 | - | 1/8 | 0/0 | 19/43 | - | - | 2/0 | - | -; 36.111; -; 8.813; - |
| 26gphy | - | - | 68/51 | - | 1/7 | 0/0 | 29/41 | - | - | 2/0 | - | -; 32.695; -; 14.979; - |
| f49kmv | - | - | 14/51 | - | 1/7 | 0/0 | 82/41 | - | - | 2/0 | - | -; 6.107; -; 37.252; - |
| quqgxg | - | - | 21/52 | - | 2/7 | 0/0 | 74/41 | - | - | 3/0 | - | -; 6.138; -; 23.108; - |
| cdr2df | - | - | 59/52 | - | 8/7 | 0/0 | 32/41 | - | - | 2/0 | - | -; 29.133; -; 20.904; - |
| j0yjwy | - | - | 48/38 | - | 1/0 | 17/28 | 24/33 | - | - | 9/0 | - | -; 3.676; -; 2.023; - |
| f75j0v | - | - | 49/38 | - | 2/0 | 15/28 | 26/33 | - | - | 10/0 | - | -; 3.803; -; 2.024; - |
| 8n2t3l | - | - | 55/38 | - | 1/0 | 12/28 | 25/33 | - | - | 8/0 | - | -; 5.075; -; 2.141; - |
| 3venyq | - | - | 57/38 | - | 1/0 | 11/28 | 22/33 | - | - | 8/0 | - | -; 5.041; -; 1.889; - |
| amtdvz | - | - | 30/38 | - | 0/0 | 4/28 | 63/33 | - | - | 3/0 | - | -; 9.020; -; 12.420; - |
| ynhjy6 | - | - | 58/38 | - | 1/0 | 10/28 | 23/33 | - | - | 7/0 | - | -; 5.466; -; 2.015; - |
| 4ekawh | - | - | 62/40 | - | 1/0 | 10/27 | 20/32 | - | - | 7/0 | - | -; 5.934; -; 1.977; - |
| 75g9ph | - | - | 63/40 | - | 1/0 | 10/27 | 19/32 | - | - | 7/0 | - | -; 5.987; -; 1.941; - |
| e976ul | - | - | 62/40 | - | 1/0 | 10/27 | 20/32 | - | - | 7/0 | - | -; 5.847; -; 2.008; - |
| kzrfmf | - | - | 62/40 | - | 1/0 | 10/27 | 20/32 | - | - | 7/0 | - | -; 5.872; -; 2.046; - |
| wawpr9 | - | - | 26/48 | - | 15/6 | - | 50/46 | - | - | 10/0 | - | -; 6.967; -; 16.285; - |
| cl46p5 | - | - | 37/48 | - | 13/11 | - | 40/41 | - | - | 10/0 | - | -; 10.465; -; 13.713; - |
| j92sv9 | - | - | 37/48 | - | 14/11 | - | 39/41 | - | - | 10/0 | - | -; 10.506; -; 13.520; - |
| wuzzxx | - | - | 44/50 | - | 7/1 | - | 44/49 | - | - | 5/0 | - | -; 3.896; -; 4.413; - |
| s39rs5 | - | - | 91/49 | - | 1/2 | - | 7/49 | - | - | 1/0 | - | -; 52.587; -; 4.461; - |
| q5fhf3 | - | - | 44/49 | - | 6/2 | - | 45/49 | - | - | 5/0 | - | -; 3.820; -; 4.290; - |
| 08mujk | - | - | 39/50 | - | 5/1 | - | 52/49 | - | - | 4/0 | - | -; 3.448; -; 5.077; - |
| c8mklq | - | - | 43/50 | - | 7/2 | - | 45/48 | - | - | 5/0 | - | -; 4.088; -; 4.954; - |
| gznx32 | - | - | 44/50 | - | 7/2 | - | 42/48 | - | - | 6/0 | - | -; 3.979; -; 4.380; - |
| w57j6w | - | - | 8/50 | - | 2/1 | - | 89/49 | - | - | 1/0 | - | -; 3.500; -; 37.399; - |
| mu0yve | - | - | 44/50 | - | 8/2 | - | 42/48 | - | - | 5/0 | - | -; 3.972; -; 4.438; - |
| jh35lq | - | - | 46/50 | - | 7/2 | - | 40/48 | - | - | 6/0 | - | -; 4.369; -; 4.419; - |
| javle6 | - | - | 30/48 | - | 11/6 | - | 46/46 | - | - | 12/0 | - | -; 9.056; -; 15.967; - |
| nmed72 | - | - | 45/48 | - | 10/11 | - | 37/41 | - | - | 8/0 | - | -; 12.252; -; 11.607; - |
| qrqfcc | - | - | 8/48 | - | 83/11 | - | 7/41 | - | - | 2/0 | - | -; 11.793; -; 122.116; - |
| zf085d | - | - | 51/50 | - | 7/1 | - | 38/49 | - | - | 4/0 | - | -; 5.597; -; 4.763; - |
| p8rc2k | - | - | 54/49 | - | 6/2 | - | 35/49 | - | - | 5/0 | - | -; 5.775; -; 4.258; - |
| rxw3n5 | - | - | 53/49 | - | 6/2 | - | 36/49 | - | - | 5/0 | - | -; 5.893; -; 4.566; - |
| ulnedq | - | - | 51/50 | - | 7/1 | - | 38/49 | - | - | 5/0 | - | -; 5.350; -; 4.667; - |
| vugk9k | - | - | 24/50 | - | 1/2 | - | 73/48 | - | - | 1/0 | - | -; 8.079; -; 25.071; - |
| dqlvp5 | - | - | 53/50 | - | 5/2 | - | 37/48 | - | - | 4/0 | - | -; 5.494; -; 4.284; - |
| gen82y | - | - | 49/50 | - | 7/1 | - | 40/49 | - | - | 4/0 | - | -; 5.006; -; 4.709; - |
| sfhsmk | - | - | 53/50 | - | 6/2 | - | 36/48 | - | - | 4/0 | - | -; 5.736; -; 4.578; - |
| ez294u | - | - | 10/50 | - | 1/2 | - | 88/48 | - | - | 1/0 | - | -; 5.662; -; 51.152; - |
| z90re2 | - | - | 26/49 | - | 12/6 | - | 53/45 | - | - | 8/0 | - | -; 9.244; -; 21.680; - |
| 802aqr | - | - | 42/48 | - | 13/11 | - | 36/41 | - | - | 10/0 | - | -; 13.611; -; 14.361; - |
| y0xwll | - | - | 40/48 | - | 12/11 | - | 39/41 | - | - | 9/0 | - | -; 9.826; -; 11.449; - |
| la0qdy | - | - | 55/50 | - | 4/1 | - | 37/49 | - | - | 4/0 | - | -; 5.655; -; 4.193; - |
| 3l5fpk | - | - | 55/49 | - | 6/2 | - | 34/49 | - | - | 5/0 | - | -; 6.067; -; 4.387; - |
| 8wysry | - | - | 86/49 | - | 2/2 | - | 10/48 | - | - | 2/0 | - | -; 33.100; -; 4.737; - |
| f706dv | - | - | 53/50 | - | 7/1 | - | 36/49 | - | - | 4/0 | - | -; 5.554; -; 4.475; - |
| p2jx4r | - | - | 55/50 | - | 6/2 | - | 34/48 | - | - | 4/0 | - | -; 6.565; -; 4.731; - |
| 5ate89 | - | - | 55/50 | - | 6/2 | - | 34/48 | - | - | 5/0 | - | -; 6.022; -; 4.362; - |
| qcqxkd | - | - | 56/50 | - | 4/1 | - | 37/49 | - | - | 3/0 | - | -; 5.804; -; 4.216; - |
| kyr3h4 | - | - | 52/50 | - | 5/2 | - | 39/48 | - | - | 4/0 | - | -; 6.230; -; 5.172; - |
| 9sdxkn | - | - | 54/50 | - | 7/2 | - | 35/48 | - | - | 4/0 | - | -; 5.982; -; 4.515; - |
| dkmlmd | - | - | 36/49 | - | 14/6 | - | 41/44 | - | - | 9/0 | - | -; 11.190; -; 16.616; - |
| tnlvav | - | - | 40/48 | - | 13/11 | - | 37/40 | - | - | 10/0 | - | -; 12.034; -; 14.002; - |
| 7lvzfk | - | - | 41/48 | - | 13/11 | - | 36/40 | - | - | 10/0 | - | -; 12.232; -; 13.943; - |
| 76n6uw | - | - | 95/48 | - | 1/6 | - | 3/46 | - | - | 1/0 | - | -; 384.747; -; 15.806; - |
| w9kztv | - | - | 3/48 | - | 1/11 | - | 95/41 | - | - | 1/0 | - | -; 12.688; -; 356.996; - |
| 4y38aj | - | - | 35/48 | - | 11/11 | - | 44/41 | - | - | 10/0 | - | -; 12.134; -; 17.176; - |
| 3wpqru | - | - | 38/49 | - | 13/6 | - | 40/45 | - | - | 9/0 | - | -; 11.405; -; 15.679; - |
| mtzn9u | - | - | 39/48 | - | 14/11 | - | 37/41 | - | - | 9/0 | - | -; 11.671; -; 14.480; - |
| svlfpg | - | - | 91/48 | - | 2/11 | - | 5/40 | - | - | 1/0 | - | -; 200.264; -; 15.535; - |
| nc7rrl | - | - | 54/50 | - | 7/1 | - | 35/49 | - | - | 4/0 | - | -; 5.962; -; 4.604; - |
| z2s7mq | - | - | 54/50 | - | 6/2 | - | 36/48 | - | - | 5/0 | - | -; 6.255; -; 4.741; - |
| 7xnktq | - | - | 8/50 | - | 1/2 | - | 90/48 | - | - | 1/0 | - | -; 6.428; -; 68.256; - |
| d5dlj7 | - | - | 55/50 | - | 5/2 | - | 36/48 | - | - | 4/0 | - | -; 6.111; -; 4.550; - |
| lzxugf | - | - | 26/50 | - | 55/2 | - | 16/48 | - | - | 2/0 | - | -; 6.353; -; 17.091; - |
| twtnps | - | - | 55/50 | - | 7/2 | - | 33/48 | - | - | 5/0 | - | -; 6.324; -; 4.518; - |
| t66cdq | - | - | 54/50 | - | 6/2 | - | 35/48 | - | - | 5/0 | - | -; 6.193; -; 4.616; - |
| g7slt0 | - | - | 34/49 | - | 13/6 | - | 44/44 | - | - | 9/0 | - | -; 9.919; -; 16.523; - |
| vs4fkg | - | - | 40/49 | - | 14/11 | - | 37/40 | - | - | 9/0 | - | -; 12.107; -; 14.814; - |
| 42n0gk | - | - | 89/49 | - | 3/11 | - | 6/40 | - | - | 1/0 | - | -; 184.899; -; 17.805; - |
| yktva0 | - | - | 37/49 | - | 13/6 | - | 41/45 | - | - | 9/0 | - | -; 9.657; -; 13.186; - |
| gesmtc | - | - | 40/48 | - | 13/11 | - | 38/41 | - | - | 10/0 | - | -; 12.281; -; 14.062; - |
| kqkg8j | - | - | 31/48 | - | 12/11 | - | 49/41 | - | - | 8/0 | - | -; 10.788; -; 18.967; - |
| ers893 | - | - | 34/49 | - | 14/6 | - | 43/44 | - | - | 9/0 | - | -; 9.526; -; 15.350; - |
| wzfj9h | - | - | 7/49 | - | 2/11 | - | 89/41 | - | - | 2/0 | - | -; 13.470; -; 165.649; - |
| mgrutq | - | - | 40/49 | - | 13/11 | - | 36/40 | - | - | 10/0 | - | -; 12.659; -; 14.547; - |
| c7culk | - | - | 55/50 | - | 4/1 | - | 37/49 | - | - | 3/0 | - | -; 5.726; -; 4.291; - |
| 2y670y | - | - | 56/50 | - | 5/2 | - | 35/48 | - | - | 4/0 | - | -; 6.133; -; 4.330; - |
| flankj | - | - | 54/50 | - | 6/2 | - | 35/48 | - | - | 4/0 | - | -; 5.899; -; 4.412; - |
| 5lv0pa | - | - | 51/50 | - | 14/2 | - | 32/48 | - | - | 4/0 | - | -; 6.267; -; 5.550; - |
| u04df7 | - | - | 53/50 | - | 7/2 | - | 36/48 | - | - | 4/0 | - | -; 5.947; -; 4.686; - |
| zsh52j | - | - | 55/50 | - | 6/2 | - | 34/48 | - | - | 4/0 | - | -; 6.228; -; 4.463; - |
| gpe444 | - | - | 56/50 | - | 5/2 | - | 36/48 | - | - | 4/0 | - | -; 5.851; -; 4.164; - |
| 4z3ggm | - | - | - | - | 1/1 | 91/99 | - | - | - | 8/0 | - | -; -; -; 3.247; - |
| 9nd5e9 | - | 85/96 | - | 1/0 | 0/1 | 8/3 | 0/0 | - | - | 6/0 | - | -; -; 19.119; 26.270; - |
| m7sdck | - | 86/87 | - | - | 0/0 | 9/13 | 0/0 | - | - | 6/0 | - | -; -; -; 7.627; - |
| nevxwn | - | 84/93 | - | 2/0 | 0/1 | 6/4 | 0/0 | - | 3/2 | 6/0 | - | -; -; 62.333; 19.489; 19.929 |
