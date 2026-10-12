#!/usr/bin/env python3
"""Report absolute cached verification walls and matched schedule ratios."""
import argparse
import hashlib
import itertools
import json
import os
import statistics
import sys
from pathlib import Path


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text())


def spread(values):
    return {'median': statistics.median(values), 'minimum': min(values),
            'maximum': max(values), 'allProcesses': values}


def summarize(plan, status, run_dir):
    require(plan['evaluations'] == 5 and plan['repetitions'] == 10, '5x10 plan')
    cases = {(case['name'], case['mode']): case for case in plan['cases']}
    require(len(cases) == len(plan['cases']) == 8, 'eight distinct contexts')
    require(len(plan['processes']) == len(status['calls']) == 18, '18 processes')
    orders = list(itertools.permutations([100, 50, 20]))
    require([[p['base'] for p in plan['processes'][b * 3:b * 3 + 3]]
             for b in range(6)] == [list(order) for order in orders], 'six permutations')
    setup_fields = ['json_hex_decode_nanoseconds', 'admission_control_nanoseconds',
                    'cache_total_nanoseconds', 'coins_context_nanoseconds',
                    'precompute_checker_nanoseconds']
    references = plan['normalizationReferences']
    require(references == [{'name': 'trxhzt', 'prefix': 'annual'}, {'name': 'l0fhm3', 'prefix': 'bare'}],
            'explicit annual and accepted-bare normalization configuration')
    require(all((ref['name'], mode) in cases for ref in references for mode in ['standard', 'consensus']),
            'both reference modes present')
    require(all(':' not in name for name, mode in cases), 'unambiguous context names')
    processes = []
    for number, (expected, call) in enumerate(zip(plan['processes'], status['calls'])):
        require(expected['block'] == number // 3 and expected['position'] == number % 3,
                'block and position')
        for field in ['block', 'position', 'base', 'name', 'stdoutFile', 'stderrFile']:
            require(call[field] == expected[field], 'call metadata: ' + field)
        require(call['returncode'] == 0 and call['pinsBefore'] == call['pinsAfter'] == 'PASS',
                'call outcome and pin checks')
        require(call['cleanup']['signals'] == [] and call['cleanup']['remainingPids'] == []
                and call['cleanup']['returncode'] == 0, 'natural owned cleanup')
        raw = [json.loads(line) for line in (run_dir / call['stdoutFile']).read_text().splitlines()]
        require(raw == call['rows'], 'raw stdout differs from recorded rows')
        sequence = [(c['name'], c['mode'], e) for c in plan['cases'] for e in range(5)]
        require([(r['name'], r['mode'], r['evaluation']) for r in raw] == sequence,
                'context/evaluation order')
        corpus_read = {r['corpus_read_nanoseconds'] for r in raw}
        require(len(corpus_read) == 1 and type(next(iter(corpus_read))) is int
                and next(iter(corpus_read)) >= 0, 'global corpus loading observation')
        record = {}
        for key, case in cases.items():
            samples = [r for r in raw if (r['name'], r['mode']) == key]
            require(len(samples) == 5, 'five evaluations per context')
            for row in samples:
                require(row['accepted'] is True and row['base_cost'] == call['base']
                        and row['repetitions'] == 10, 'accepted schedule/count')
                for field in ['flags', 'tx_bytes', 'inputs', 'sigchecks']:
                    require(row[field] == case[field], 'context metadata: ' + field)
                require(type(row['cached_verify_nanoseconds']) is int
                        and row['cached_verify_nanoseconds'] > 0, 'positive integer verification wall')
                require(row['tx_bytes'] > 0, 'actual spending byte denominator')
            setup = {}
            for field in setup_fields:
                values = {r[field] for r in samples}
                require(len(values) == 1 and type(next(iter(values))) is int
                        and next(iter(values)) >= 0, 'once-per-context observation: ' + field)
                setup[field] = next(iter(values))
            ns = [r['cached_verify_nanoseconds'] / r['repetitions'] for r in samples]
            mean_ns = statistics.mean(ns)
            record[':'.join(key)] = {
                'meanVerifyMs': mean_ns / 1e6, 'nsPerTxByte': mean_ns / case['tx_bytes'],
                'internalEvaluationMs': [value / 1e6 for value in ns],
                'txBytes': case['tx_bytes'], 'inputs': case['inputs'],
                'flags': case['flags'], 'sigchecks': case['sigchecks'],
                'setupNanosecondsOncePerContext': setup}
        for key, value in record.items():
            mode = key.split(':')[1]
            for ref in references:
                name, prefix = ref['name'], ref['prefix']
                denominator = record[name + ':' + mode]
                value[prefix + 'RelativeTime'] = value['meanVerifyMs'] / denominator['meanVerifyMs']
                value[prefix + 'RelativePerByte'] = value['nsPerTxByte'] / denominator['nsPerTxByte']
                value[prefix + 'DenominatorMs'] = denominator['meanVerifyMs']
                value[prefix + 'DenominatorNsPerByte'] = denominator['nsPerTxByte']
                value[prefix + 'DenominatorBytes'] = denominator['txBytes']
        processes.append({field: call[field] for field in
                          ['name', 'block', 'position', 'base', 'processWallSeconds',
                           'lifecycleWallSeconds', 'nativeStartedUtc', 'nativeFinishedUtc']})
        processes[-1].update(cases=record, corpusReadNanosecondsOncePerProcess=next(iter(corpus_read)))
    aggregate = {}
    for base in [100, 50, 20]:
        selected = [p for p in processes if p['base'] == base]
        require(len(selected) == 6, 'six observations per schedule')
        entries = {}
        for key, first in selected[0]['cases'].items():
            value = {field: first[field] for field in ['txBytes', 'inputs', 'flags', 'sigchecks']}
            for field in first:
                if field in ['meanVerifyMs', 'nsPerTxByte'] or field.endswith(
                        ('RelativeTime', 'RelativePerByte', 'DenominatorMs', 'DenominatorNsPerByte')):
                    value[field] = spread([p['cases'][key][field] for p in selected])
                elif field.endswith('DenominatorBytes'):
                    require(len({p['cases'][key][field] for p in selected}) == 1, field)
                    value[field] = first[field]
            value['setupNanosecondsOncePerContext'] = {
                field: spread([p['cases'][key]['setupNanosecondsOncePerContext'][field] for p in selected])
                for field in setup_fields}
            entries[key] = value
        aggregate[str(base)] = entries
    pairs = {}
    for base in [50, 20]:
        entries = {}
        for key in processes[0]['cases']:
            observations = []
            for block in range(6):
                control = next(p for p in processes if p['block'] == block and p['base'] == 100)
                candidate = next(p for p in processes if p['block'] == block and p['base'] == base)
                numerator, denominator = candidate['cases'][key], control['cases'][key]
                observations.append({'block': block, 'numeratorProcess': candidate['name'],
                    'denominatorProcess': control['name'], 'numeratorMs': numerator['meanVerifyMs'],
                    'denominatorMs': denominator['meanVerifyMs'], 'txBytes': numerator['txBytes'],
                    'relativeTime': numerator['meanVerifyMs'] / denominator['meanVerifyMs'],
                    'relativePerByte': numerator['nsPerTxByte'] / denominator['nsPerTxByte']})
            ratios = [p['relativeTime'] for p in observations]
            entries[key] = {'observations': observations, 'relativeTime': spread(ratios),
                'relativePerByte': spread([p['relativePerByte'] for p in observations]),
                'aboveOne': sum(r > 1 for r in ratios), 'belowOne': sum(r < 1 for r in ratios),
                'equalOne': sum(r == 1 for r in ratios)}
        pairs[str(base)] = entries
    return {'processes': processes, 'aggregateByBase': aggregate, 'pairedBase100': pairs,
            'timingRows': 720, 'timedWholeTransactionLoops': 7200,
            'processWallSeconds': {str(base): spread([p['processWallSeconds'] for p in processes
                                                     if p['base'] == base]) for base in [100, 50, 20]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--plan-sha', required=True)
    parser.add_argument('--run-dir', type=Path, required=True)
    parser.add_argument('--raw-manifest', type=Path, required=True)
    parser.add_argument('--raw-sha', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    require(__debug__ and sys.flags.optimize == 0 and os.environ.get('PYTHONOPTIMIZE') is None,
            'Python assertions enabled and PYTHONOPTIMIZE unset')
    require(digest(args.plan) == args.plan_sha, 'plan hash')
    require(digest(args.raw_manifest) == args.raw_sha, 'raw manifest hash')
    root = args.raw_manifest.resolve().parent
    run_dir = args.run_dir.resolve()
    require(root == run_dir or root in run_dir.parents, 'run directory belongs to raw packet')
    manifest = load(args.raw_manifest)
    for name, pin in manifest['files'].items():
        path = (root / name).resolve()
        require(root in path.parents and path.is_file(), 'manifest member containment')
        require(path.stat().st_size == pin['bytes'] and digest(path) == pin['sha256'], name)
    status_path = run_dir / 'status.json'
    require(str(status_path.relative_to(root)) in manifest['files'], 'status is a pinned raw member')
    plan, status = load(args.plan), load(status_path)
    require(status['status'] == 'PASS_RAW_TIMING_PENDING_INDEPENDENT_REVIEW', 'completed raw timing')
    require(status.get('plan') == plan or status.get('planSha256') == args.plan_sha, 'raw plan binding')
    for call in status['calls']:
        for field in ['stdoutFile', 'stderrFile']:
            path = (run_dir / call[field]).resolve()
            require(str(path.relative_to(root)) in manifest['files'], 'pinned raw stream')
    readiness_path = run_dir / 'readiness.json'
    require(str(readiness_path.relative_to(root)) in manifest['files'], 'host readiness is a pinned raw member')
    readiness = load(readiness_path)
    require(readiness['status'] == 'PASS_FRESH_BLS_MATCHED_TIMING_READINESS', 'actual BLS host readiness')
    summary = summarize(plan, status, run_dir)
    summary['hostReadiness'] = readiness
    summary.update(status='AUTHOR_SCHEDULE_SUMMARY_PENDING_INDEPENDENT_REVIEW',
        planSha256=args.plan_sha, rawManifestSha256=args.raw_sha, boundary=plan['boundary'],
        qualifications=plan['qualifications'],
        statistic='Each process: mean of5 evaluations, each10 complete cached transaction loops. Displayed medians/ranges cover6 process means per schedule.',
        relativeScope='Annual/bare ratios are formed within each process and mode. Base100 ratios pair distinct processes within each counterbalanced three-process block; denominator absolute times and identities are retained.',
        setupScope='Decode/cache measured once per context/process, deduplicated across evaluations. Corpus loading is global once/process. Coins/context and checker/precomputation are already inside cache total. Admission includes uncached verification and is separately outside cached timing.',
        inference='Identical-artifact experimental schedule comparison in this fresh runtime context. No causal speedup, universal ceiling, VM memory, network admission, safety or optimal-schedule conclusion follows automatically; historical timings in another library context are not a paired control.')
    require(not args.output.exists(), 'fresh output directory')
    args.output.mkdir(parents=True)
    (args.output / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (args.output / 'plan.json').write_bytes(args.plan.read_bytes())
    (args.output / 'parser.py').write_bytes(Path(__file__).read_bytes())
    lines = ['# Identical-artifact schedule timing', '',
             '**Author summary; completed independent review pending.**', '', summary['statistic'], '',
             'Host: ' + readiness['hostname'] + '; chip: ' + readiness['chip'] + '. Readiness and thermal/memory observations are snapshots.', '',
             '| Base | Artifact / mode | Spending bytes | VerifyScript ms (range) | ns/byte (range) | Annual per byte (range) | Accepted bare per byte (range) |',
             '|---:|---|---:|---:|---:|---:|---:|']
    def display(value):
        return '{:.6f} ({:.6f}–{:.6f})'.format(value['median'], value['minimum'], value['maximum'])
    for base, entries in summary['aggregateByBase'].items():
        for key, value in entries.items():
            lines.append('| ' + base + ' | ' + key + ' | ' + str(value['txBytes']) + ' | ' +
                         ' | '.join(display(value[field]) for field in
                                    ['meanVerifyMs', 'nsPerTxByte', 'annualRelativePerByte', 'bareRelativePerByte']) + ' |')
    lines += ['', summary['relativeScope'], '', summary['setupScope'], '', summary['boundary'], '',
              summary['qualifications'], '', summary['inference'], '',
              'Process and lifecycle elapsed walls are separate from verification. JSON retains every absolute reference, setup component, evaluation and paired-block observation.']
    (args.output / 'README.md').write_text('\n'.join(lines) + '\n')
    (args.output / 'manifest.json').write_text(json.dumps({'status': summary['status'], 'files': {
        p.name: {'bytes': p.stat().st_size, 'sha256': digest(p)}
        for p in sorted(args.output.iterdir()) if p.is_file()}}, indent=2) + '\n')
    print(json.dumps({'status': summary['status'], 'manifestSha256': digest(args.output / 'manifest.json'),
                      'timingRows': summary['timingRows'], 'loops': summary['timedWholeTransactionLoops']}))


if __name__ == '__main__':
    main()
