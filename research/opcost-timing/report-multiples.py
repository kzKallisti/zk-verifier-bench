#!/usr/bin/env python3
"""Headline multiples for REPORT.md, on three explicitly named budget bases (BCHN figures only).

Inputs: kernels/results/summary.json (BCHN kernel estimates, KERNELS.md) and the l0fhm3 / sound-native rows of
raw/bchn-run2/results.jsonl (BCHN.md reference run).  Usage:
    python3 -I report-multiples.py <opcost-timing dir>   > report-multiples.md

Budget bases (per input, BCH 2026 VM-limits: op-cost budget = (41 + unlocking bytes) x 800):
  bare     the singleton's script sits in the spent output's locking bytecode, as measured; only the 265-459 B
           unlocking counts (non-standard: P2S locking cap is 201 B; the CHIP leaves UTXO bytes out on purpose)
  p2sh     P2SH32 deployment: the script is pushed in the unlocking bytecode (3-byte OP_PUSHDATA2 + script), so the
           budget is (41 + 3 + score bytes) x 800, score = script + proof/unlocking bytes (results.json)
  bchspec  libauth BCH_SPEC density base: (10,000 + 3 + score bytes) x 800 (P2SH-style, script in unlocking)
"""
import json, sys, os
D = sys.argv[1]
SCORE = {'bn-plain': 8206, 'bn-opt': 6237, 'bn-genpow': 4613, 'bls-plain': 7510, 'bls-opt': 5999, 'bls-genpow': 5965}
NAME = {'bn-plain': 'BN plain', 'bn-opt': 'BN opcode-optimized', 'bn-genpow': 'BN genpow',
        'bls-plain': 'BLS plain', 'bls-opt': 'BLS opcode-optimized', 'bls-genpow': 'BLS genpow'}
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(D, 'raw/bchn-run2/results.jsonl')) if '"id"' in l}
l0 = rows['l0fhm3']
l0_ns = l0['nsPerTx']; l0_budget = sum(l0['budgetPerInput']); l0_bytes = l0['txBytes']
l0_per_unit = l0_ns / l0_budget; l0_per_byte = l0_ns / l0_bytes
print(f'l0fhm3 (BCHN run 2): {l0_ns/1e6:.2f} ms, budget {l0_budget:,}, {l0_per_unit:.3f} ns per budget unit, '
      f'{l0_per_byte:.0f} ns per tx byte, {l0["nsPerOpCost"]:.3f} ns per op-cost unit\n')
print('| singleton | op-cost | BCHN est. | ns/op-cost | budget bare | p2sh | bchspec | op-cost over budget: bare / p2sh / bchspec '
      '| CPU x l0fhm3 per budget unit: bare / p2sh / bchspec | op-cost-over / CPU-multiple (p2sh) |')
print('|---|--:|--:|--:|--:|--:|--:|---|---|--:|')
for s in json.load(open(os.path.join(D, 'kernels/results/summary.json'))):
    t = s['engines']['bchn']['est']; oc = s['totalOpCost']; sc = SCORE[s['tag']]
    b = {'bare': s['budget'], 'p2sh': (44 + sc) * 800, 'bchspec': (10_003 + sc) * 800}
    over = {k: oc / v for k, v in b.items()}
    mult = {k: (t / v) / l0_per_unit for k, v in b.items()}
    t_s = f'{t/1e9:.2f} s' if t > 1e9 else f'{t/1e6:.1f} ms'
    print(f"| {NAME[s['tag']]} ({sc:,} B) | {oc/1e6:,.0f} M | {t_s} | {t/oc:.3f} | {b['bare']:,} | {b['p2sh']:,} | {b['bchspec']:,} | "
          f"{over['bare']:,.0f} / {over['p2sh']:,.0f} / {over['bchspec']:,.0f} | {mult['bare']:,.0f} / {mult['p2sh']:,.0f} / {mult['bchspec']:,.1f} | "
          f"{over['p2sh']/mult['p2sh']:.1f} |")
print('\nSound-native chains (BCH 2026 consensus-valid, measured whole on BCHN, run 2):\n')
print('| chain | tx B | op-cost | budget | µs | ns/op-cost | x l0fhm3 per op-cost unit | x l0fhm3 per budget unit | x l0fhm3 per tx byte |')
print('|---|--:|--:|--:|--:|--:|--:|--:|--:|')
for id in ('bch-groth16-bn254-sound-native:valid', 'bch-groth16-bls12381-sound-native:valid'):
    r = rows[id]; bud = sum(r['budgetPerInput'])
    print(f"| {id.split(':')[0]} | {r['txBytes']:,} | {r['opCostPerTx']:,} | {bud:,} | {r['nsPerTx']/1e3:,.0f} | {r['nsPerOpCost']:.3f} | "
          f"{r['nsPerOpCost']/l0['nsPerOpCost']:.3f} | {(r['nsPerTx']/bud)/l0_per_unit:.3f} | {(r['nsPerTx']/r['txBytes'])/l0_per_byte:.3f} |")
