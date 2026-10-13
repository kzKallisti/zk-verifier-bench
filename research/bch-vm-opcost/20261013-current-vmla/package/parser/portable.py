"""Offline path adapter. No native process, network, or benchmark execution."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OWNERS_SHA = 'a08132da2ac6fdffa71226e21ed3a08bdf4ef7787d5f5bec8132aac8a26c779e'

def require(ok, message):
    if not ok:
        raise ValueError(message)

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def read(path):
    return json.loads(path.read_text())

def authenticate(path, expected, size=None):
    require(path.is_file() and not path.is_symlink(), 'regular file: ' + str(path))
    require(digest(path) == expected, 'hash: ' + str(path))
    if size is not None:
        require(path.stat().st_size == size, 'size: ' + str(path))
    return path

def member(directory, name, pin):
    relative = Path(name)
    require(not relative.is_absolute() and '..' not in relative.parts, 'relative member')
    p = directory / relative
    require(p.resolve().relative_to(directory.resolve()) == relative, 'member alias')
    return authenticate(p, pin['sha256'], pin.get('bytes'))

def load_owners():
    authenticate(HERE / 'measured-owners.json', OWNERS_SHA)
    owners = read(HERE / 'measured-owners.json')
    for name, expected in owners['ownerFiles'].items():
        authenticate(HERE / 'owners' / name, expected)
    modules = []
    for name in ('corpus', 'report'):
        spec = importlib.util.spec_from_file_location('portable_' + name, HERE / 'owners' / (name + '.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        modules.append(module)
    return owners, modules[0], modules[1]

def archive(directory, expected):
    p = authenticate(directory / 'archive-manifest.json', expected)
    return read(p)

def calculation_projection(directory, archive_sha, raw_sha):
    """Authenticate the fixed calculation subset, not omitted native evidence."""
    ar = archive(directory, archive_sha)
    raw_path = member(directory, 'raw-manifest.json', ar['files']['raw-manifest.json'])
    authenticate(raw_path, raw_sha)
    raw = read(raw_path)
    required = {'contract.json', 'plan.json', 'status.json'}
    omitted = set()
    for process in range(6):
        name = 'timing-' + str(process)
        required.update((name + '.json', name + '.stdout'))
        omitted.update((name + '.stderr', name + '-processes.txt'))
    require(set(raw['files']) == required | omitted, 'exact native raw inventory')
    # The authenticated original inventories agree on every member even when
    # this calculation-only package intentionally does not contain its bytes.
    for name, pin in raw['files'].items():
        require(ar['files'].get(name) == pin, 'raw/archive member agreement: ' + name)
    for name in sorted(required):
        member(directory, name, raw['files'][name])
    return ar, raw, {
        'authenticatedCalculationMembers': sorted(required),
        'omittedNativeProvenanceMembers': sorted(omitted),
        'archiveOnlyMembersNotConsumed': sorted(set(ar['files']) - set(raw['files']) - {'raw-manifest.json'}),
        'rawManifestSha256': raw_sha, 'archiveManifestSha256': archive_sha,
        'qualification': 'Omitted stderr/loader and process-census bytes were not revalidated. This subset reproduces calculations, not the complete native provenance review.'}


def checked_json(directory, manifest, name):
    return read(member(directory, name, manifest['files'][name]))

def jsonl(path):
    # Complete ordered streams, including all policy and rejected rows.
    with path.open() as f:
        return [json.loads(line) for line in f]

def input_pin(rows):
    h = hashlib.sha256(); size = 0
    for row in rows:
        data = (json.dumps(row, separators=(',', ':')) + '\n').encode()
        size += len(data); h.update(data)
    return {'bytes': size, 'sha256': h.hexdigest()}

def reconstruct(catalog, corpus):
    rows = catalog['rows']; schedules = corpus.schedules(rows)
    require(len(catalog['orders']) == 6, 'six portable orders')
    for schedule, order in zip(schedules, catalog['orders']):
        require(schedule['process'] == order['process'], 'process order')
        require([r['registration_id'] for r in schedule['rows']] == order['registrationIds'], 'exact registration order')
        require(input_pin(schedule['rows']) == order['inputPin'], 'exact original input serialization')
    return schedules

def capture_rows(corpus, mode):
    """Reproduce AG prepare.py field alignment before AH full-oracle binding.

    AG serializes both cohorts using standard[0]'s field order, appending
    external_reference and filling only its absent values with False.
    AH reads those exact rows; direct compose_campaign rows are not identical.
    """
    cohorts = {m: corpus.compose_campaign(m)[0] for m in ('standard', 'consensus')}
    field_order = list(cohorts['standard'][0])
    if any('external_reference' in row for rows in cohorts.values() for row in rows):
        field_order.append('external_reference')
    result = []
    for row in cohorts[mode]:
        require(set(row) <= set(field_order), 'unexpected capture source field')
        require(set(field_order) - set(row) <= {'external_reference'}, 'missing capture source field')
        result.append({field: row[field] if field in row else False for field in field_order})
    return result

def catalog(args):
    owners, corpus, reporter = load_owners(); pins = owners['modes'][args.mode]
    require(not args.output.exists(), 'fresh output')
    # The only corpus-owner change is its input filesystem mapping. Its fixed
    # EXPECTED hashes and actual compose_campaign/binding/order functions remain.
    corpus.PATHS = {key: args.classification_dir / value.name for key, value in corpus.PATHS.items()}
    rows = capture_rows(corpus, args.mode)
    ca = archive(args.capture_dir, pins['captureArchiveSha256'])
    raw = checked_json(args.capture_dir, ca, 'raw-manifest.json')
    authenticate(args.capture_dir / 'raw-manifest.json', pins['captureRawSha256'])
    require(raw['sourceManifestSha256'] == 'eb0babb10b2ff64a3f323806f0c50034b7738800b083b3fffaaffd366646bb99', 'capture source')
    rm = authenticate(args.capture_review_dir / 'manifest.json', pins['captureReviewManifestSha256'])
    rmv = read(rm)
    for name, pin in rmv['files'].items():
        member(args.capture_review_dir, name, pin)
    receipt = read(authenticate(args.capture_review_dir / 'review.json', pins['captureReviewSha256']))
    require(rmv['files']['review.json']['sha256'] == pins['captureReviewSha256'], 'review member')
    captured = member(args.capture_dir, pins['captureStdoutName'], ca['files'][pins['captureStdoutName']])
    authenticate(captured, pins['captureStdoutSha256'])
    bound = reporter.bind_full_oracle(jsonl(captured), rows, receipt, pins['captureVerdict'], pins['captureRawSha256'], pins['captureRawSha256'])
    ta = archive(args.timing_dir, pins['timingArchiveSha256'])
    contract = checked_json(args.timing_dir, ta, 'contract.json')
    require(contract['mode'] == args.mode, 'timing mode')
    require(contract['inputPins'][1:] == pins['timingInputPins'], 'measured input pins')
    schedules = corpus.schedules(bound['rows']); orders = []
    for schedule, original in zip(schedules, pins['timingInputPins']):
        pin = input_pin(schedule['rows'])
        require(pin == {k: original[k] for k in ('bytes','sha256')}, 'regenerated measured input')
        orders.append({'process': schedule['process'], 'registrationIds': [r['registration_id'] for r in schedule['rows']], 'inputPin': pin})
    value = {'mode': args.mode, 'rows': bound['rows'], 'orders': orders,
             'captureRawManifestSha256': pins['captureRawSha256'], 'captureReviewSha256': pins['captureReviewSha256'],
             'timingRawManifestSha256': pins['timingRawSha256'], 'qualification': 'Portable calculation inputs, not new native observations.'}
    reconstruct(value, corpus)
    save(args.output, 'catalog.json', value, 'PASS_PORTABLE_CATALOG_RECONSTRUCTION')

def save(output, name, value, status):
    output.mkdir(mode=0o700, parents=False)
    p = output / name
    with p.open('x') as f:
        f.write(json.dumps(value, indent=2, allow_nan=False) + '\n')
    mf = {'status': status, 'files': {name: {'bytes': p.stat().st_size, 'sha256': digest(p)}},
          'adapterSourceSha256': digest(HERE / 'portable.py'), 'measuredOwnersSha256': OWNERS_SHA,
          'nativeExecuted': False, 'publicAvailabilityEstablished': False}
    with (output / 'manifest.json').open('x') as f:
        f.write(json.dumps(mf, indent=2) + '\n')
    return mf

def reparse(args):
    owners, corpus, reporter = load_owners()
    require(not args.output.exists(), 'fresh output')
    mf = read(authenticate(args.catalog / 'manifest.json', args.catalog_manifest_sha256))
    require(mf['status'] == 'PASS_PORTABLE_CATALOG_RECONSTRUCTION' and mf['measuredOwnersSha256'] == OWNERS_SHA, 'catalog origin')
    value = checked_json(args.catalog, mf, 'catalog.json'); mode = value['mode']; pins = owners['modes'][mode]
    require(value['captureRawManifestSha256'] == pins['captureRawSha256'] and value['captureReviewSha256'] == pins['captureReviewSha256'] and value['timingRawManifestSha256'] == pins['timingRawSha256'], 'measured evidence binding')
    schedules = reconstruct(value, corpus)
    ar, raw, projection = calculation_projection(args.timing_dir, pins['timingArchiveSha256'], pins['timingRawSha256'])
    require(raw['mode'] == mode, 'raw mode')
    status = checked_json(args.timing_dir, ar, 'status.json')
    require(status['status'] == 'PASS_RAW_CURRENT_TIMING_' + mode.upper() + '_PENDING_INDEPENDENT_REVIEW', 'completed raw status')
    require(len(status['jobs']) == 6 and not any(status['remainingOwnedGroups'].values()), 'six clean jobs')
    rows = []; walls = {}
    for schedule, job in zip(schedules, status['jobs']):
        process = schedule['process']; name = 'timing-' + str(process)
        receipt = checked_json(args.timing_dir, ar, name + '.json')
        require(job == receipt and job['process'] == process and job['name'] == name, 'job identity')
        require(job['returncode'] == 0 and job['status'] == 'PASS_RAW_MIXED_JOB' and job['cleanup']['signals'] == [] and job['cleanup']['remainingPids'] == [], 'clean native terminal')
        require(job['argv'][-2:] == ['3','2'] and job['argv'][1] == '--timing', 'measured cadence')
        stream = member(args.timing_dir, name + '.stdout', ar['files'][name + '.stdout'])
        actual = jsonl(stream)
        require(len(actual) == len(schedule['rows']) * 3, 'complete stream')
        for position, row in enumerate(actual):
            require('process' not in row, 'no native process decoration')
            require(row['line'] == position // 3 + 1 and row['evaluation'] == position % 3, 'actual emitted row order')
            require(row['oracle_provenance'] == 'reviewed-full-input-capture', 'measured oracle provenance')
            if row['classification'] != 'pre_script_policy_rejection':
                require(row['cached_verify_nanoseconds'] > 0, 'positive measured cached clock')
            rows.append(dict(row, process=process))
        walls[process] = round(job['processWallSeconds'] * 1000000000)
    result = reporter.report(rows, value['rows'], schedules, walls)
    if args.reference_report:
        # Compare the entire numerical/report core; only the existing root
        # adapter's three provenance strings are outside unchanged report().
        expected = read(authenticate(args.reference_report, pins['derivedReportSha256']))
        for key in ('actualRawManifest', 'mode', 'credit'):
            expected.pop(key, None)
        expected['qualification'] = result['qualification']
        require(result == expected, 'complete reviewed report core equality')
    result['portableEvidence'] = {'mode': mode, 'rawManifestSha256': pins['timingRawSha256'], 'catalogManifestSha256': args.catalog_manifest_sha256, 'nativeExecuted': False, 'calculationProjection': projection}
    save(args.output, 'report.json', result, 'PASS_PORTABLE_OFFLINE_TIMING_REPARSE')

def main():
    p = argparse.ArgumentParser(description=__doc__); sub = p.add_subparsers(dest='command')
    c = sub.add_parser('catalog'); c.add_argument('--mode', choices=('standard','consensus'), required=True)
    for name in ('classification-dir','capture-dir','capture-review-dir','timing-dir','output'): c.add_argument('--'+name, type=Path, required=True)
    q = sub.add_parser('reparse')
    for name in ('catalog','timing-dir','output'): q.add_argument('--'+name, type=Path, required=True)
    q.add_argument('--catalog-manifest-sha256', required=True); q.add_argument('--reference-report', type=Path)
    args = p.parse_args()
    if args.command == 'catalog': catalog(args)
    elif args.command == 'reparse': reparse(args)
    else:
        owners, _, _ = load_owners()
        print(json.dumps({'status':'PASS_SOURCE_OWNER_AUTHENTICATION_ONLY','ownerFiles':len(owners['ownerFiles']),'nativeExecuted':False,'rawReparsed':False}))

if __name__ == '__main__':
    main()
