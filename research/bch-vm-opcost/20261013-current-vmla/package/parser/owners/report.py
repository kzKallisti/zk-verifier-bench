"""Pure validation and reporting for the current-rules mixed-timing packet.

This module consumes future capture or timing JSONL only.  It never invokes a
VM, native binary, compiler, network, or clock.  In particular, current
classification rows contain stop-first prefixes; a timing report is rejected
until an independently reviewed full-input capture supplies the missing tail.
"""
import collections
import hashlib
import json
import math
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
REQUIRED_WALLS = (
    "corpus_read_nanoseconds", "json_hex_decode_nanoseconds", "cache_total_nanoseconds",
    "coins_context_nanoseconds", "precompute_checker_nanoseconds",
    "pre_control_nanoseconds", "post_control_nanoseconds", "policy_preflight_nanoseconds",
)
REFERENCE_ROLES = (
    "annual-standard-trxhzt-2023", "annual-standard-trxhzt-2025",
    "annual-standard-trxhzt-2026", "current-standard-trxhzt",
    "current-consensus-trxhzt", "current-standard-bare", "current-consensus-bare",
)

def _driver_output_fields():
    contract = HERE / "driver-contract.json"
    require(contract.exists(), "driver contract is required")
    fields = json.loads(contract.read_text())["output"]["fields"]
    require(isinstance(fields, list) and len(fields) == len(set(fields)), "driver output field contract")
    return set(fields)

def _check_output_fields(actual, timing):
    fields = _driver_output_fields()
    if timing:
        fields = fields | {"process"}
    require(set(actual) == fields, "exact driver output fields")

def require(condition, message):
    if not condition:
        raise ValueError(message)

def nonnegative_int(value, field):
    require(type(value) is int and value >= 0, field + " must be a nonnegative integer")

def _finite_number(value, field):
    require(isinstance(value, (int, float)) and math.isfinite(value) and value >= 0, field)

def _vector(value, field, full_length=None):
    require(isinstance(value, list), field + " must be a list")
    if full_length is not None:
        require(len(value) == full_length, field + " must cover every input")
    for index, item in enumerate(value):
        require(isinstance(item, dict), field + " item")
        require(item.get("index") == index, field + " index order")
        require(type(item.get("accepted")) is bool and isinstance(item.get("error"), str), field + " item type")
        require(item["accepted"] == (item["error"] == "No error"), field + " acceptance/error")
    return value

def _first_error(vector):
    for item in vector:
        if not item["accepted"]:
            return item["error"]
    return "OK"

def _accepted(vector):
    return bool(vector) and all(item["accepted"] for item in vector)

def _source_fields(actual, expected):
    for field in (
        "registration_id", "name", "pack", "mode", "domain", "base_cost", "source_line",
        "source_identity", "source_mode", "transaction_sha256", "ordered_utxos_sha256",
        "ordered_utxos_bytes", "tx_bytes", "inputs", "flags",
    ):
        require(actual.get(field) == expected.get(field), "source field mismatch: " + field)
    actual_roles = actual.get("roles")
    if actual_roles is None and "role" in actual:
        actual_role = actual.get("role")
        require(actual_role in expected.get("roles", []) or
                (actual_role == "case" and not expected.get("roles")), "reference role mismatch")
    else:
        require(actual_roles == expected.get("roles"), "reference role mismatch")
    require(actual.get("supplemental", False) == expected.get("supplemental", False), "supplemental mismatch")

def _payload(expected):
    require(len(expected["transaction_sha256"]) == 64 and len(expected["ordered_utxos_sha256"]) == 64,
            "payload hash metadata")
    require(type(expected["tx_bytes"]) is int and expected["tx_bytes"] > 0, "transaction bytes")
    require(type(expected["ordered_utxos_bytes"]) is int and expected["ordered_utxos_bytes"] > 0,
            "UTXO bytes")

def _common_row(actual, expected, process=None, evaluation=None):
    _source_fields(actual, expected)
    _payload(expected)
    if process is not None:
        require(actual.get("process") == process, "process")
    if evaluation is not None:
        require(actual.get("evaluation") == evaluation, "evaluation")
    require(actual.get("input_attempt_count_kind") == "source-derived-all-input-loop-not-instrumented",
            "input count provenance")

def _check_vectors(actual, expected, timing):
    prefix = expected.get("recorded_oracle")
    if prefix is None:
        require(expected.get("classification") == "pre_script_policy_rejection", "policy expected classification")
        require(actual.get("classification") == "pre_script_policy_rejection", "policy classification")
        require(actual.get("reason") == expected.get("policy_reason"), "policy reason")
        require(actual.get("pre_input_outcomes") == [] and actual.get("post_input_outcomes") == [],
                "policy rows have no script vector")
        require(actual.get("input_attempts_per_iteration") == 0, "policy input attempts")
        require(actual.get("accepted") is None and actual.get("first_script_error") is None,
                "policy aggregate result")
        require(actual.get("timing_performed") is False, "policy timing")
        require(actual.get("cached_verify_nanoseconds") is None, "policy cached time")
        require(actual.get("oracle_scope") == ("full-observed-all-input" if timing else expected.get("oracle_scope")),
                "policy oracle scope")
        require(actual.get("known_prefix_inputs") == 0 and actual.get("observed_tail_inputs") == 0,
                "policy oracle geometry")
        require(actual.get("untimed_control_passes") == (0 if timing else 0), "policy control passes")
        return
    observed = _vector(actual.get("pre_input_outcomes"), "pre_input_outcomes", expected["inputs"])
    post = _vector(actual.get("post_input_outcomes"), "post_input_outcomes", expected["inputs"])
    require(observed == post, "pre/post vector mismatch")
    if timing:
        require(expected.get("oracle_scope") == "full-observed-all-input", "timing expected oracle scope")
        require(isinstance(expected.get("oracle"), list) and len(expected["oracle"]) == expected["inputs"],
                "timing expected full oracle")
        require(observed == expected["oracle"], "bound full oracle mismatch")
        require(actual.get("known_prefix_inputs") == expected["inputs"], "timing known prefix count")
        require(actual.get("observed_tail_inputs") == 0, "timing observed tail count")
    else:
        require(observed[:len(prefix)] == prefix, "source prefix mismatch")
        require(actual.get("known_prefix_inputs") == len(prefix), "known prefix count")
        require(actual.get("observed_tail_inputs") == expected["inputs"] - len(prefix), "observed tail count")
    require(actual.get("input_attempts_per_iteration") == expected["inputs"], "all-input attempt count")
    require(actual.get("accepted") is _accepted(observed), "aggregate accepted")
    require(actual.get("first_script_error") == _first_error(observed), "first script error")
    expected_classification = ("all_scripts_accepted" if expected.get("classification") in
                               ("all_scripts_accepted", "supplemental_reference") else "script_rejection")
    require(actual.get("classification") == expected_classification, "script classification")
    require(actual.get("reason") is None, "script oracle reason")
    if timing:
        require(actual.get("timing_performed") is True, "timing performed")
        require(isinstance(actual.get("oracle_provenance"), str) and actual.get("oracle_provenance"),
                "timing oracle provenance")
        require(actual.get("oracle_scope") == "full-observed-all-input", "timing oracle scope")
        require(actual.get("untimed_control_passes") == 2, "timing untimed controls")
        nonnegative_int(actual.get("cached_verify_nanoseconds"), "cached_verify_nanoseconds")
    else:
        require(actual.get("timing_performed") is False, "capture timing")
        require(actual.get("cached_verify_nanoseconds") is None, "capture cached time")
        require(actual.get("oracle_scope") == expected.get("oracle_scope"), "capture oracle scope")
        require(actual.get("untimed_control_passes") ==
                (0 if expected.get("recorded_oracle") is None else 2), "capture passes")

def _check_setup(actual, untimed=False):
    for field in REQUIRED_WALLS[:-1]:
        if untimed:
            require(actual.get(field) is None, field + " must be null for capture")
        elif actual.get("classification") == "pre_script_policy_rejection" and field in ("pre_control_nanoseconds", "post_control_nanoseconds"):
            require(actual.get(field) is None, field + " must be null for pre-script policy")
        else:
            nonnegative_int(actual.get(field), field)
    if untimed:
        require(actual.get("policy_preflight_nanoseconds") is None, "policy preflight must be null for capture")
    elif actual.get("domain") == "official-annual-pack":
        require(actual.get("policy_preflight_nanoseconds") is None, "annual policy preflight")
    else:
        nonnegative_int(actual.get("policy_preflight_nanoseconds"), "policy_preflight_nanoseconds")

def validate_capture_rows(rows, campaign_rows):
    """Validate one untimed two-pass capture row per campaign row.

    A capture may extend a source prefix, but it may not invent that tail.  A
    later timing run must carry the reviewed capture's full oracle and use the
    timing validator below.
    """
    expected_by_id = {row["registration_id"]: row for row in campaign_rows}
    require(len(expected_by_id) == len(campaign_rows), "campaign identities")
    require(len(rows) == len(campaign_rows), "capture row count")
    seen = set()
    for actual in rows:
        identity = actual.get("registration_id")
        require(identity in expected_by_id and identity not in seen, "capture identity")
        seen.add(identity)
        expected = expected_by_id[identity]
        _check_output_fields(actual, False)
        _common_row(actual, expected)
        require(actual.get("operation") == "capture", "capture operation")
        require(actual.get("evaluation") == 0 and actual.get("repetitions") == 0, "capture schedule")
        require(isinstance(actual.get("oracle_provenance"), str) and actual.get("oracle_provenance"),
                "capture provenance")
        _check_vectors(actual, expected, False)
        require(actual.get("untimed_control_passes") ==
                (0 if expected.get("recorded_oracle") is None else 2), "capture passes")
        _check_setup(actual, untimed=True)
        require(actual.get("op_cost") is None and actual.get("sigchecks") is None and actual.get("hash_iters") is None,
                "capture resource fields")
    require(seen == set(expected_by_id), "missing capture rows")
    return {"status": "PASS_SOURCE_CURRENT_CAPTURE_ROWS", "rows": len(rows),
            "timing_ready": False, "requiresIndependentReview": True,
            "qualification": "Observed full vectors remain unbound until an external completed-capture review receipt is verified."}

def bind_full_oracle(capture_rows, campaign_rows, review_receipt, required_verdict,
                     expected_subject_manifest_sha256, raw_manifest_sha256):
    """Bind reviewed capture observations into a timing-input oracle.

    This is deliberately a pure gate.  It requires a caller-supplied exact
    review verdict and subject/raw manifest hashes, validates the actual
    capture vectors, and returns fresh input rows; it never creates timing
    output or treats a provenance string as independent review.
    """
    capture_result = validate_capture_rows(capture_rows, campaign_rows)
    require(isinstance(review_receipt, dict), "capture review receipt")
    require(review_receipt.get("verdict") == required_verdict, "capture review verdict")
    require(review_receipt.get("subjectManifestSha256") == expected_subject_manifest_sha256,
            "capture review subject")
    require(isinstance(expected_subject_manifest_sha256, str) and len(expected_subject_manifest_sha256) == 64,
            "capture subject hash")
    require(review_receipt.get("rawManifestSha256") == raw_manifest_sha256,
            "capture raw manifest")
    require(isinstance(raw_manifest_sha256, str) and len(raw_manifest_sha256) == 64,
            "capture raw hash")
    expected_by_id = {row["registration_id"]: row for row in campaign_rows}
    bound = []
    for observed in capture_rows:
        expected = expected_by_id[observed["registration_id"]]
        if expected.get("recorded_oracle") is None:
            oracle = []
        else:
            oracle = observed["pre_input_outcomes"]
            require(len(oracle) == expected["inputs"], "reviewed capture must cover every input")
        item = dict(expected)
        item["role"] = expected["roles"][0] if expected.get("roles") else "case"
        item["oracle"] = oracle
        item["oracle_scope"] = "full-observed-all-input"
        item["oracle_provenance"] = "reviewed-full-input-capture"
        bound.append(item)
    require(len(bound) == len(campaign_rows), "bound capture roster")
    return {"status": "PASS_SOURCE_CURRENT_FULL_ORACLE_BIND", "rows": bound,
            "captureValidation": capture_result, "reviewVerdict": required_verdict,
            "subjectManifestSha256": expected_subject_manifest_sha256,
            "rawManifestSha256": raw_manifest_sha256,
            "qualification": "Bound rows are timing inputs only after the supplied independent review receipt; no native timing was performed."}

def _schedule_index(schedules, expected_count):
    index = {}
    for schedule in schedules:
        process = schedule["process"]
        require(process not in index and process in range(6), "process schedule")
        roster = {row["registration_id"]: (position + 1, row)
                  for position, row in enumerate(schedule["rows"])}
        require(len(roster) == expected_count, "schedule roster")
        index[process] = roster
    require(set(index) == set(range(6)), "six schedules")
    return index

def validate_timing_rows(rows, campaign_rows, schedules, evaluations=3, repetitions=2):
    """Validate timing rows after an independently reviewed full capture."""
    require(evaluations == 3 and repetitions == 2, "current timing cadence")
    expected_count = len(campaign_rows)
    index = _schedule_index(schedules, expected_count)
    by_id = {row["registration_id"]: row for row in campaign_rows}
    expected_rows = 6 * expected_count * evaluations
    require(len(rows) == expected_rows, "timing row count")
    seen = set()
    normalized = []
    for actual in rows:
        process, evaluation = actual.get("process"), actual.get("evaluation")
        nonnegative_int(process, "process"); nonnegative_int(evaluation, "evaluation")
        require(process in index and evaluation < evaluations, "process/evaluation")
        identity = actual.get("registration_id")
        require(identity in by_id, "unknown registration")
        key = (process, evaluation, identity)
        require(key not in seen, "duplicate timing row")
        seen.add(key)
        position, expected = index[process].get(identity, (None, None))
        require(expected is not None, "row absent from schedule")
        require(actual.get("line") == position, "schedule line")
        _check_output_fields(actual, True)
        _common_row(actual, expected, process, evaluation)
        require(actual.get("operation") == "timing", "timing operation")
        require(actual.get("repetitions") == repetitions, "repetitions")
        _check_vectors(actual, expected, True)
        if expected.get("recorded_oracle") is None:
            require(actual.get("untimed_control_passes") == 0, "policy timing controls")
        _check_setup(actual)
        require(actual.get("op_cost") is None and actual.get("sigchecks") is None and actual.get("hash_iters") is None,
                "timing resource fields")
        normalized.append({"row": actual, "expected": expected, "process": process, "evaluation": evaluation,
                           "per_iteration_ns": (None if expected.get("recorded_oracle") is None else
                                                 actual["cached_verify_nanoseconds"] / float(repetitions))})
    require(len(seen) == expected_rows, "missing timing rows")
    _validate_setup_repetition(normalized)
    return normalized

def _validate_setup_repetition(normalized):
    corpus = {}
    registration = {}
    for item in normalized:
        row = item["row"]
        process = item["process"]
        corpus.setdefault(process, row["corpus_read_nanoseconds"])
        require(corpus[process] == row["corpus_read_nanoseconds"], "corpus setup repeated")
        key = (process, row["registration_id"])
        setup = tuple(row[field] for field in ("json_hex_decode_nanoseconds", "cache_total_nanoseconds",
                                                "coins_context_nanoseconds", "precompute_checker_nanoseconds"))
        registration.setdefault(key, setup)
        require(registration[key] == setup, "registration setup repeated")

def _reference_index(normalized):
    refs = {}
    for item in normalized:
        row = item["row"]
        # Roles are source-roster ownership metadata.  The driver emits one
        # selected role string, so use the pinned expected row here to retain
        # the 2026 standard trxhzt dual-role denominator.
        for role in item["expected"].get("roles", []):
            if role not in REFERENCE_ROLES:
                continue
            # Annual denominators are pack-specific.  Current-mode
            # denominators are the exact 2026 current registrations reused
            # for every source-year case in that effective mode.
            if role.startswith("current-") and row["pack"] != "2026":
                continue
            key = (item["process"], item["evaluation"],
                   row["pack"] if role.startswith("annual-") else row["mode"], role)
            require(key not in refs, "duplicate reference " + repr(key))
            refs[key] = item
    return refs

def _mean_reference(refs, process, evaluation, pack, role):
    values = [refs[(process, ev, pack, role)]["per_iteration_ns"] for ev in range(3)]
    return statistics.mean(values)

def derive_samples(normalized):
    """Compute only metrics supported by actual full timing rows."""
    refs = _reference_index(normalized)
    by_case_process = collections.defaultdict(list)
    for item in normalized:
        by_case_process[(item["row"]["registration_id"], item["process"])].append(item)
    samples = []
    for item in normalized:
        row, expected = item["row"], item["expected"]
        if expected.get("recorded_oracle") is None:
            continue
        case_mean = statistics.mean(x["per_iteration_ns"] for x in by_case_process[(row["registration_id"], item["process"])])
        annual_role = "annual-standard-trxhzt-{}".format(row["pack"])
        current_trxhzt_role = "current-{}-trxhzt".format(row["mode"])
        bare_role = "current-{}-bare".format(row["mode"])
        annual = refs.get((item["process"], item["evaluation"], row["pack"], annual_role))
        current_trxhzt = refs.get((item["process"], item["evaluation"], row["mode"], current_trxhzt_role))
        bare = refs.get((item["process"], item["evaluation"], row["mode"], bare_role))
        if not expected.get("external_reference"):
            require(annual is not None, "missing annual denominator")
            require(current_trxhzt is not None and bare is not None, "missing current-mode denominator")
        annual_mean = _mean_reference(refs, item["process"], item["evaluation"], row["pack"], annual_role) if annual else None
        current_trxhzt_mean = _mean_reference(refs, item["process"], item["evaluation"], row["mode"], current_trxhzt_role) if current_trxhzt else None
        bare_mean = _mean_reference(refs, item["process"], item["evaluation"], row["mode"], bare_role) if bare else None
        sample = {
            "registration_id": row["registration_id"], "name": row["name"], "pack": row["pack"],
            "mode": row["mode"], "process": item["process"], "evaluation": item["evaluation"],
            "spending_bytes": expected["transaction_bytes"],
            "cached_milliseconds": item["per_iteration_ns"] / 1e6,
            "nanoseconds_per_actual_spending_byte": item["per_iteration_ns"] / float(expected["transaction_bytes"]),
            "process_mean_cached_milliseconds": case_mean / 1e6,
            "process_mean_nanoseconds_per_actual_spending_byte": case_mean / float(expected["transaction_bytes"]),
            "official_annual_ratio": case_mean / annual_mean if annual_mean else None,
            "official_annual_ratio_per_byte": ((case_mean / annual_mean) * annual["expected"]["transaction_bytes"] /
                                                expected["transaction_bytes"]) if annual_mean else None,
            "same_mode_trxhzt_ratio": case_mean / current_trxhzt_mean if current_trxhzt_mean else None,
            "same_mode_trxhzt_ratio_per_byte": ((case_mean / current_trxhzt_mean) * current_trxhzt["expected"]["transaction_bytes"] /
                                                 expected["transaction_bytes"]) if current_trxhzt_mean else None,
            "same_mode_bare_ratio": case_mean / bare_mean if bare_mean else None,
            "same_mode_bare_ratio_per_byte": (case_mean / bare_mean) * bare["expected"]["transaction_bytes"] / expected["transaction_bytes"] if bare_mean else None,
            "absolute_denominators": {
                "annual_milliseconds": annual["per_iteration_ns"] / 1e6 if annual else None,
                "current_trxhzt_milliseconds": current_trxhzt["per_iteration_ns"] / 1e6 if current_trxhzt else None,
                "current_bare_milliseconds": bare["per_iteration_ns"] / 1e6 if bare else None,
                "annual_spending_bytes": annual["expected"]["transaction_bytes"] if annual else None,
                "current_trxhzt_spending_bytes": current_trxhzt["expected"]["transaction_bytes"] if current_trxhzt else None,
                "current_bare_spending_bytes": bare["expected"]["transaction_bytes"] if bare else None,
            },
            "reference_owners": {
                "annual": {"registration_id": annual["row"]["registration_id"], "role": annual_role,
                            "mode": annual["row"]["mode"], "domain": annual["row"]["domain"], "flags": annual["row"]["flags"]} if annual else None,
                "current_trxhzt": {"registration_id": current_trxhzt["row"]["registration_id"], "role": current_trxhzt_role,
                                   "mode": current_trxhzt["row"]["mode"], "domain": current_trxhzt["row"]["domain"], "flags": current_trxhzt["row"]["flags"]} if current_trxhzt else None,
                "current_bare": {"registration_id": bare["row"]["registration_id"], "role": bare_role,
                                 "mode": bare["row"]["mode"], "domain": bare["row"]["domain"], "flags": bare["row"]["flags"]} if bare else None,
            },
            "setup_walls_nanoseconds": {field: row[field] for field in REQUIRED_WALLS},
        }
        samples.append(sample)
    return samples

def _stats(values):
    require(values and all(math.isfinite(value) for value in values), "finite statistics")
    return {"mean": statistics.mean(values), "median": statistics.median(values), "min": min(values), "max": max(values)}

def summarize(samples, process_walls, policy_receipts=None):
    require(set(int(key) for key in process_walls) == set(range(6)), "six process walls")
    for key, value in process_walls.items():
        nonnegative_int(value, "process wall {}".format(key))
    process_setup = {}
    registration_setup = {}
    for sample in samples:
        walls = sample["setup_walls_nanoseconds"]
        process = sample["process"]
        process_setup.setdefault(str(process), walls["corpus_read_nanoseconds"])
        require(process_setup[str(process)] == walls["corpus_read_nanoseconds"], "process setup mismatch")
        key = (str(process), sample["registration_id"])
        setup = {field: walls[field] for field in ("json_hex_decode_nanoseconds", "cache_total_nanoseconds",
                                                    "coins_context_nanoseconds", "precompute_checker_nanoseconds")}
        registration_setup.setdefault(key, setup)
        require(registration_setup[key] == setup, "registration setup mismatch")
    case_process = {}
    for sample in samples:
        case_process.setdefault((sample["registration_id"], sample["process"]), sample)
    case_process_summary = {}
    for registration_id in sorted({sample["registration_id"] for sample in samples}):
        per_process = [case_process[(registration_id, process)] for process in range(6)]
        case_process_summary[registration_id] = {
            "processMeanCachedMilliseconds": _stats([item["process_mean_cached_milliseconds"] for item in per_process]),
            "processMeanNanosecondsPerByte": _stats([item["process_mean_nanoseconds_per_actual_spending_byte"] for item in per_process]),
            "officialAnnualRatioOfMeans": _stats([item["official_annual_ratio"] for item in per_process if item["official_annual_ratio"] is not None]) if any(item["official_annual_ratio"] is not None for item in per_process) else None,
            "officialAnnualRatioPerByteOfMeans": _stats([item["official_annual_ratio_per_byte"] for item in per_process if item["official_annual_ratio_per_byte"] is not None]) if any(item["official_annual_ratio_per_byte"] is not None for item in per_process) else None,
            "sameModeTrxhztRatioOfMeans": _stats([item["same_mode_trxhzt_ratio"] for item in per_process if item["same_mode_trxhzt_ratio"] is not None]) if any(item["same_mode_trxhzt_ratio"] is not None for item in per_process) else None,
            "sameModeTrxhztRatioPerByteOfMeans": _stats([item["same_mode_trxhzt_ratio_per_byte"] for item in per_process if item["same_mode_trxhzt_ratio_per_byte"] is not None]) if any(item["same_mode_trxhzt_ratio_per_byte"] is not None for item in per_process) else None,
            "sameModeBareRatioOfMeans": _stats([item["same_mode_bare_ratio"] for item in per_process if item["same_mode_bare_ratio"] is not None]) if any(item["same_mode_bare_ratio"] is not None for item in per_process) else None,
            "sameModeBareRatioPerByteOfMeans": _stats([item["same_mode_bare_ratio_per_byte"] for item in per_process if item["same_mode_bare_ratio_per_byte"] is not None]) if any(item["same_mode_bare_ratio_per_byte"] is not None for item in per_process) else None,
        }
    denominator_values = collections.defaultdict(list)
    denominator_bytes = collections.defaultdict(list)
    denominator_owners = {}
    denominator_seen = set()
    for sample in samples:
        absolute = sample["absolute_denominators"]
        for kind, field in (("annual", "annual_milliseconds"),
                            ("current-trxhzt", "current_trxhzt_milliseconds"),
                            ("current-bare", "current_bare_milliseconds")):
            key = (sample["process"], sample["evaluation"], sample["pack"], sample["mode"], kind)
            if absolute[field] is not None and key not in denominator_seen:
                denominator_seen.add(key)
                denominator_values[(sample["pack"], sample["mode"], kind)].append(absolute[field])
                byte_field = {"annual": "annual_spending_bytes", "current-trxhzt": "current_trxhzt_spending_bytes", "current-bare": "current_bare_spending_bytes"}[kind]
                denominator_bytes[(sample["pack"], sample["mode"], kind)].append(absolute[byte_field])
                owner_key = {"annual": "annual", "current-trxhzt": "current_trxhzt", "current-bare": "current_bare"}[kind]
                denominator_owners.setdefault((sample["pack"], sample["mode"], kind), sample["reference_owners"][owner_key])
    denominator_ranges = {
        "{}/{}/{}".format(pack, mode, kind): {"samples_milliseconds": values,
                                               "min": min(values), "max": max(values),
                                               "samples_nanoseconds_per_byte": [ms * 1000000.0 / byte for ms, byte in zip(values, denominator_bytes[(pack, mode, kind)])],
                                               "spending_bytes": denominator_bytes[(pack, mode, kind)],
                                               "owner": denominator_owners[(pack, mode, kind)],
                                               "sample_count": len(values)}
        for (pack, mode, kind), values in denominator_values.items()
    }
    return {"status": "PASS_SOURCE_CURRENT_MIXED_TIMING_REPORT", "samples": samples,
            "rows": len(samples), "processes": 6, "evaluations": 3, "repetitions": 2,
            "processElapsedNanoseconds": {str(key): value for key, value in process_walls.items()},
            "setupSummary": {"processCorpusReadNanoseconds": process_setup,
                              "registrationSetup": [{"process": int(process), "registration_id": registration, **setup}
                                                     for (process, registration), setup in sorted(registration_setup.items())],
                              "repeatedFieldsAreNotSummed": True},
            "denominatorRanges": denominator_ranges,
            "caseProcessSummary": case_process_summary,
            "policyReceipts": policy_receipts or [],
            "qualification": "Absolute cached VerifyScript samples and within-process ratios require a reviewed full-input capture; setup, controls, and process walls are separate."}

def report(rows, campaign_rows, schedules, process_walls):
    normalized = validate_timing_rows(rows, campaign_rows, schedules)
    policy_receipts = [item["row"] for item in normalized if item["expected"].get("recorded_oracle") is None]
    return summarize(derive_samples(normalized), process_walls, policy_receipts)
