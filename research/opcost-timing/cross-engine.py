#!/usr/bin/env python3
"""Cross-engine consistency check for the opcost-timing report (no new measurements).

Joins the BCHN reference run (raw/bchn-run2/summary.csv) with the bchd-fork and libauth
results of opcost-full (full/results/summary.json) on VM-limits vector id, and prints
per-engine time ratios and rank correlations of ns per op-cost unit, by vector group.

usage: python3 -I cross-engine.py <work/opcost-timing>
"""
import csv, json, statistics as st, sys, os

root = sys.argv[1]
bchn = {}
with open(os.path.join(root, 'raw/bchn-run2/summary.csv')) as f:
    for r in csv.DictReader(f):
        if r['asExpected'] == 'true' and r['nsPerOpCost'] and r['set'] not in ('baseline', 'sound-native'):
            bchn[r['id']] = r
full = json.load(open(os.path.join(root, 'full/results/summary.json')))
rows = []
for v in full['vmb']:
    b = bchn.get(v['id'])
    if not b or v['opCost'] < 10000:
        continue
    t = float(b['nsPerTx'])
    sig = 'signature-checking' in v['group']
    rows.append(dict(id=v['id'], sig=sig, group=v['group'], bchn=t, bchd=v['bchdMed'], lib=v['libMed'],
                     bchnN=float(b['nsPerOpCost']), bchdN=v['bchdNsPerCost'], libN=v['libNsPerCost']))

def rank(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0] * len(xs)
    for k, i in enumerate(o): r[i] = k
    return r

def spearman(a, b):
    ra, rb = rank(a), rank(b); n = len(a)
    ma, mb = st.mean(ra), st.mean(rb)
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5
    return num / den

def q(xs, p):
    xs = sorted(xs); return xs[min(len(xs) - 1, int(p * (len(xs) - 1) + 0.5))]

print('| subset | n | bchd / BCHN time: median (p5–p95) | libauth / BCHN time: median (p5–p95) | Spearman ns/op-cost BCHN~bchd | BCHN~libauth |')
print('|---|--:|---|---|--:|--:|')
for name, sel in [('all vectors (op-cost >= 10k)', lambda r: True), ('signature checking', lambda r: r['sig']),
                  ('everything else', lambda r: not r['sig']),
                  ('non-signature, BCHN time >= 100 us', lambda r: not r['sig'] and r['bchn'] >= 1e5),
                  ('non-signature, BCHN time < 100 us', lambda r: not r['sig'] and r['bchn'] < 1e5)]:
    s = [r for r in rows if sel(r)]
    if len(s) < 3:
        continue
    d = [r['bchd'] / r['bchn'] for r in s]; l = [r['lib'] / r['bchn'] for r in s]
    print(f"| {name} | {len(s)} | {st.median(d):.2f} ({q(d,.05):.2f}–{q(d,.95):.2f}) | {st.median(l):.1f} ({q(l,.05):.1f}–{q(l,.95):.1f}) | "
          f"{spearman([r['bchnN'] for r in s],[r['bchdN'] for r in s]):.2f} | {spearman([r['bchnN'] for r in s],[r['libN'] for r in s]):.2f} |")

print()
print('Top 5 ns/op-cost per engine (vectors above):')
for k in ('bchnN', 'bchdN', 'libN'):
    top = sorted(rows, key=lambda r: -r[k])[:5]
    print(f"- {k}: " + ', '.join(f"{r['id']} {r[k]:.2f}" for r in top))
