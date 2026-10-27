l0fhm3 (BCHN run 2): 100.03 ms, budget 79,984,000, 1.251 ns per budget unit, 1000 ns per tx byte, 1.430 ns per op-cost unit

| singleton | op-cost | BCHN est. | ns/op-cost | budget bare | p2sh | bchspec | op-cost over budget: bare / p2sh / bchspec | CPU x l0fhm3 per budget unit: bare / p2sh / bchspec | op-cost-over / CPU-multiple (p2sh) |
|---|--:|--:|--:|--:|--:|--:|---|---|--:|
| BN plain (8,206 B) | 771 M | 148.5 ms | 0.192 | 250,400 | 6,600,000 | 14,567,200 | 3,080 / 117 / 53 | 474 / 18 / 8.1 | 6.5 |
| BN opcode-optimized (6,237 B) | 800 M | 155.0 ms | 0.194 | 250,400 | 5,024,800 | 12,992,000 | 3,196 / 159 / 62 | 495 / 25 / 9.5 | 6.5 |
| BN genpow (4,613 B) | 5,520 M | 916.0 ms | 0.166 | 199,200 | 3,725,600 | 11,692,800 | 27,709 / 1,482 / 472 | 3,677 / 197 / 62.6 | 7.5 |
| BLS plain (7,510 B) | 995 M | 120.5 ms | 0.121 | 350,400 | 6,043,200 | 14,010,400 | 2,838 / 165 / 71 | 275 / 16 / 6.9 | 10.3 |
| BLS opcode-optimized (5,999 B) | 1,004 M | 124.8 ms | 0.124 | 350,400 | 4,834,400 | 12,801,600 | 2,864 / 208 / 78 | 285 / 21 / 7.8 | 10.1 |
| BLS genpow (5,965 B) | 25,610 M | 6.06 s | 0.237 | 196,800 | 4,807,200 | 12,774,400 | 130,130 / 5,327 / 2,005 | 24,609 / 1,007 / 379.1 | 5.3 |

Sound-native chains (BCH 2026 consensus-valid, measured whole on BCHN, run 2):

| chain | tx B | op-cost | budget | µs | ns/op-cost | x l0fhm3 per op-cost unit | x l0fhm3 per budget unit | x l0fhm3 per tx byte |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| bch-groth16-bn254-sound-native | 27,519 | 20,572,881 | 21,994,400 | 3,578 | 0.174 | 0.122 | 0.130 | 0.130 |
| bch-groth16-bls12381-sound-native | 34,089 | 24,040,286 | 27,248,800 | 3,032 | 0.126 | 0.088 | 0.089 | 0.089 |
