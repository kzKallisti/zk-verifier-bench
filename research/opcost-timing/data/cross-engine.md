| subset | n | bchd / BCHN time: median (p5–p95) | libauth / BCHN time: median (p5–p95) | Spearman ns/op-cost BCHN~bchd | BCHN~libauth |
|---|--:|---|---|--:|--:|
| all vectors (op-cost >= 10k) | 231 | 1.04 (0.25–4.89) | 34.8 (4.7–209.2) | 0.71 | 0.44 |
| signature checking | 14 | 3.09 (2.36–5.59) | 15.0 (4.8–60.8) | 0.03 | 0.01 |
| everything else | 217 | 0.96 (0.25–4.60) | 36.9 (4.7–209.2) | 0.68 | 0.45 |
| non-signature, BCHN time >= 100 us | 41 | 0.71 (0.32–1.29) | 9.4 (4.1–54.3) | 0.61 | 0.42 |
| non-signature, BCHN time < 100 us | 176 | 1.04 (0.25–4.69) | 49.7 (5.9–236.0) | 0.70 | 0.54 |

Top 5 ns/op-cost per engine (vectors above):
- bchnN: wuzzxx 1.72, w57j6w 1.72, 08mujk 1.71, mu0yve 1.68, c8mklq 1.68
- bchdN: t0z6jt 7.67, d5rw9l 7.52, 30mvm8 7.01, 99mssa 6.28, p406sl 6.00
- libN: l0fhm3 86.88, d5rw9l 86.76, ly54y8 85.36, 90e2p7 84.89, v8lscg 77.00
