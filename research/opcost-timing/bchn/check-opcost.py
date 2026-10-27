# Cross-check: libauth op-cost of the tested input (rig, relocated tx) vs the VMB stats CSV published with the vectors.
import json, csv, sys, os
res, vmb = sys.argv[1], sys.argv[2]
rows = [json.loads(l) for l in open(res)]
cache = {}; n = mism = 0
for r in rows:
    g = r.get('group') or ''
    if not g.startswith('bch_2026') or 'opCostPerInput' not in r: continue
    d, f = g.split('/'); stats = os.path.join(vmb, d, f.replace('.vmb_tests.json', '.nonstandard_stats.csv'))
    if stats not in cache: cache[stats] = {x['Test ID']: x for x in csv.DictReader(open(stats))}
    s = cache[stats].get(r['id'])
    if not s: continue
    idx = int(s['Tested Input Index']); mine = r['opCostPerInput'][idx]; theirs = int(s['Operation Cost']); n += 1
    if mine != theirs: mism += 1; print(f"{r['id']} idx {idx}: rig {mine} vs csv {theirs} (resigned inputs change sig push sizes?)")
print(f"{n} compared, {mism} differ")
