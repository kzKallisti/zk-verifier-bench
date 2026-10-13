"""Pure source corpus composition for current-mode VMLA timing.

This owner prepares capture inputs from the completed AD classification packet.
It does not fill unknown post-failure outcomes from another cohort and does not
invoke a VM, compiler, native binary, network, or timer.
"""
import hashlib
import itertools
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
RESEARCH = HERE.parents[2]
RESULT = RESEARCH / "results/20261012/vmla-fullstock-classification-AD-a1-run-a1"
EXPECTED = {
    "annual": (73063985, "c1ade2c16c57b2088fc57880c31134947575112106a899eaef1d2391e5485ce3"),
    "annual_outcomes": (6536514, "c99680550c2801c7eeb115343d2de6aa52f9ed14aff128918c367ce92f176559"),
    "current_standard": (73239701, "9db04d0e63121cb7066175079762f410a208af6771844030d32070a86ebe6166"),
    "current_standard_outcomes": (4293698, "39833ce72d0643af5082f2bd675a86516aede96608ad9cbff1d072e390fcb3ff"),
    "current_consensus": (73242955, "d869b02d149557128249ba12e8aa744c52ff5f7d7719e88da3f99d4222b25d92"),
    "current_consensus_outcomes": (5443680, "058058b58823e04f906f5c22c6730eb735badb1d531732681aeff7f5de273457"),
    "mapping": (1805794, "cda9edd59b6cca8797f08fac1accce9e87130cbe6547021327e73d21e714635c"),
    "paired": (865495, "1144b53d487104561c1697896f5c2ba61a0858279316f893e5b20d0c2e75cb3b"),
}
PATHS = {
    "annual": RESULT / "annual.jsonl", "annual_outcomes": RESULT / "annual.stdout",
    "current-standard": RESULT / "current-standard.jsonl", "current-standard_outcomes": RESULT / "current-standard.stdout",
    "current-consensus": RESULT / "current-consensus.jsonl", "current-consensus_outcomes": RESULT / "current-consensus.stdout",
    "mapping": RESULT / "mapping.json", "paired": RESULT / "paired-current.json",
}
PACKS = ("2023", "2025", "2026")
MODES = ("standard", "consensus")
PROCESS_ORDERS = (
    (("2023", "2025", "2026"), "forward"), (("2023", "2026", "2025"), "reverse"),
    (("2025", "2023", "2026"), "forward"), (("2025", "2026", "2023"), "reverse"),
    (("2026", "2023", "2025"), "forward"), (("2026", "2025", "2023"), "reverse"),
)
CURRENT_FLAGS = {"standard": 535906287, "consensus": 396445551}
ANNUAL_FLAGS = {
    ("2023", "standard"): 66144239, ("2023", "consensus"): 60899691,
    ("2025", "standard"): 267470831, ("2025", "consensus"): 128008555,
    ("2026", "standard"): 535906287, ("2026", "consensus"): 396444011,
}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def read_json(path):
    return json.loads(Path(path).read_text())

def read_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line]

def input_count(transaction):
    raw = bytes.fromhex(transaction)
    require(len(raw) >= 5, "transaction header")
    marker = raw[4]
    if marker < 253:
        return marker
    width = {253: 2, 254: 4, 255: 8}.get(marker)
    require(width is not None and len(raw) >= 5 + width, "transaction input count")
    return int.from_bytes(raw[5:5 + width], "little")

def _payload_check(source, outcome):
    for field in ("name", "pack", "transaction", "utxos", "transaction_bytes", "ordered_utxos_bytes",
                  "transaction_sha256", "ordered_utxos_sha256"):
        if field in outcome:
            require(outcome[field] == source[field], "payload mismatch: " + field)
    tx = bytes.fromhex(source["transaction"]); utxos = bytes.fromhex(source["utxos"])
    require(len(tx) == source["transaction_bytes"] == source["tx_bytes"], "transaction bytes")
    require(len(utxos) == source["ordered_utxos_bytes"], "UTXO bytes")
    require(hashlib.sha256(tx).hexdigest() == source["transaction_sha256"], "transaction hash")
    require(hashlib.sha256(utxos).hexdigest() == source["ordered_utxos_sha256"], "UTXO hash")
    require(input_count(source["transaction"]) == outcome["inputs"], "input count")

def _validate_pins():
    for key, path in PATHS.items():
        expected_bytes, expected_sha = EXPECTED[key.replace("-", "_")]
        require(path.stat().st_size == expected_bytes, key + " bytes")
        require(digest(path) == expected_sha, key + " SHA-256")

def load_sources(verify_pins=True):
    if verify_pins:
        _validate_pins()
    sources = {}; outcomes = {}
    for cohort in ("annual", "current-standard", "current-consensus"):
        sources[cohort] = read_jsonl(PATHS[cohort])
        outcomes[cohort] = read_jsonl(PATHS[cohort + "_outcomes"])
        require(len(sources[cohort]) == 3254 and len(outcomes[cohort]) == 3254, cohort + " rows")
        require([row["line"] for row in outcomes[cohort]] == list(range(1, 3255)), cohort + " line order")
        require(len({tuple(row["identity"]) for row in sources[cohort]}) == 3254, cohort + " identities")
        for source, outcome in zip(sources[cohort], outcomes[cohort]):
            require(source["name"] == outcome["name"] and source["pack"] == outcome["pack"], cohort + " identity")
            require(outcome["domain"] == ("official-annual-pack" if cohort == "annual" else "current-rules-projection"), cohort + " domain")
            expected_flags = ANNUAL_FLAGS[(source["pack"], source["mode"])] if cohort == "annual" else CURRENT_FLAGS[source["mode"]]
            require(outcome["flags"] == expected_flags and outcome["base_cost"] == 100, cohort + " flags")
            _payload_check(source, outcome)
    mapping = read_json(PATHS["mapping"]); paired = read_json(PATHS["paired"])
    require(len(mapping) == 3254 and len(paired["rows"]) == 3254, "mapping/paired rows")
    return sources, outcomes, mapping, paired

def _recorded_oracle(outcome):
    values = outcome.get("input_outcomes")
    if values is None:
        require(outcome["classification"] == "pre_script_policy_rejection", "only policy rows omit vectors")
        require(outcome["script_inputs_attempted"] == 0 and outcome["script_accepted"] is None, "policy row")
        return None
    require(len(values) == outcome["script_inputs_attempted"], "prefix length")
    for index, item in enumerate(values):
        require(item["index"] == index and isinstance(item["accepted"], bool) and isinstance(item["error"], str), "prefix item")
        require(item["accepted"] == (item["error"] == "No error"), "prefix acceptance")
    return values

def _first_error(values):
    for item in values or []:
        if not item["accepted"]:
            return item["error"]
    return "OK"

def _make_row(cohort, line, source, outcome):
    policy = outcome["classification"] == "pre_script_policy_rejection"
    prefix = _recorded_oracle(outcome)
    complete = prefix is not None and outcome["script_inputs_attempted"] == outcome["inputs"] and outcome.get("all_inputs_attempted") is True
    actual_mode = source["mode"]
    source_mode = source.get("source_mode", source["mode"])
    roles = []
    if source["identity"][1] == "trxhzt":
        if cohort == "annual":
            roles.append("annual-standard-trxhzt-{0}".format(source["pack"]))
        elif source["pack"] == "2026":
            roles.append("current-{0}-trxhzt".format(actual_mode))
    # The source identity is reused across the standard and consensus
    # projections.  A bare reference role belongs only to the matching
    # effective/source mode; attaching it to both rows would make the same
    # artifact appear as both current-mode references.
    if source["identity"][1] == "l0fhm3" and source["pack"] == "2026" and source_mode == "standard" and actual_mode == "standard":
        roles.append("current-standard-bare")
    if source["identity"][1] == "l0fhm3" and source["pack"] == "2026" and source_mode == "consensus" and actual_mode == "consensus":
        roles.append("current-consensus-bare")
    return {
        "registration_id": "{0}:original:{1}:{2}".format(cohort, line, source["name"]),
        "cohort": cohort, "domain": outcome["domain"], "base_cost": 100, "line": line, "source_line": line,
        "source_identity": [str(value) for value in source["identity"]], "source_mode": source_mode, "mode": actual_mode,
        "flags": outcome["flags"], "name": source["name"], "pack": source["pack"], "roles": roles,
        "role": roles[0] if roles else "case",
        # The native decoder requires this field on every input, including
        # original registrations.  Only the annual rows appended below are
        # supplemental.
        "supplemental": False,
        "transaction": source["transaction"], "utxos": source["utxos"], "transaction_sha256": source["transaction_sha256"],
        "ordered_utxos_sha256": source["ordered_utxos_sha256"], "transaction_bytes": source["transaction_bytes"],
        "ordered_utxos_bytes": source["ordered_utxos_bytes"], "tx_bytes": source["tx_bytes"], "inputs": outcome["inputs"],
        "classification": outcome["classification"], "policy_reason": outcome.get("reason"),
        "oracle_classification": "pre_script_policy_rejection" if policy else outcome["classification"],
        "oracle_reason": outcome.get("reason") if policy else None,
        "oracle_scope": "recorded-stop-first-prefix" if policy else ("recorded-full-all-input" if complete else "recorded-stop-first-prefix"),
        "oracle": prefix or [], "known_prefix_inputs": len(prefix or []),
        "expected_error": (source.get("expected_error") if cohort == "annual" else
                           (None if policy else _first_error(prefix))),
        "source_expected_error": source.get("source_expected_error", source.get("expected_error")),
        "recorded_oracle": prefix, "recorded_oracle_complete": complete,
        "recorded_input_attempts": outcome["script_inputs_attempted"], "recorded_accepted": outcome.get("script_accepted"),
        "recorded_first_error": outcome.get("first_script_error"),
        "oracle_provenance": "policy-precheck-no-script" if policy else ("recorded-native-all-inputs" if complete else "recorded-native-stop-first-prefix"),
        "timing_required": not policy,
    }

def compose_campaign(mode, verify_pins=True):
    require(mode in MODES, "mode")
    sources, outcomes, mapping, paired = load_sources(verify_pins)
    current_cohort = "current-" + mode
    rows = [_make_row(current_cohort, line, source, outcome) for line, (source, outcome) in enumerate(zip(sources[current_cohort], outcomes[current_cohort]), 1)]
    # The 2026 standard trxhzt registration is also the annual-2026 standard
    # denominator only when the payload, flags, and input boundary are exact.
    if mode == "standard":
        annual_2026 = next(row for row in sources["annual"]
                           if row["pack"] == "2026" and row["identity"][1] == "trxhzt")
        current_2026 = next(row for row in sources[current_cohort]
                            if row["pack"] == "2026" and row["identity"][1] == "trxhzt")
        require(annual_2026["transaction"] == current_2026["transaction"], "2026 trxhzt transaction boundary")
        require(annual_2026["utxos"] == current_2026["utxos"], "2026 trxhzt UTXO boundary")
        require(ANNUAL_FLAGS[("2026", "standard")] == CURRENT_FLAGS["standard"], "2026 standard flags")
        next(row for row in rows if row["pack"] == "2026" and row["source_identity"][1] == "trxhzt")["roles"].append(
            "annual-standard-trxhzt-2026")
    annual_sources, annual_outcomes = sources["annual"], outcomes["annual"]
    # Add exact annual standard trxhzt references not already represented by the
    # current 2026 trxhzt row. The 2026 current-standard payload is the same
    # annual-standard reference only when its flags/boundary are equal.
    extra_packs = PACKS if mode == "consensus" else ("2023", "2025")
    for pack in extra_packs:
        index = next(i for i, row in enumerate(annual_sources) if row["pack"] == pack and row["identity"][1] == "trxhzt")
        source, outcome = annual_sources[index], annual_outcomes[index]
        extra = _make_row("annual-reference-extra", index + 1, source, outcome)
        extra["registration_id"] = "{0}:annual-standard-trxhzt:{1}:{2}".format(mode, pack, source["name"])
        extra["cohort"] = current_cohort
        # These rows are annual denominator references.  The campaign they
        # are carried in is orthogonal to their effective annual execution
        # mode; preserve the official pack flags and domain.
        extra["domain"] = "official-annual-pack"
        extra["mode"] = "standard"
        extra["flags"] = ANNUAL_FLAGS[(pack, "standard")]
        extra["source_mode"] = source.get("source_mode", source["mode"])
        extra["supplemental"] = True
        extra["classification"] = outcome["classification"]
        extra["expected_error"] = source.get("expected_error")
        extra["timing_required"] = True
        extra["oracle_provenance"] = "required-all-accepted"
        extra["roles"] = ["annual-standard-trxhzt-{0}".format(pack)]
        extra["role"] = extra["roles"][0]
        extra["external_reference"] = True
        rows.append(extra)
    expected_rows = 3256 if mode == "standard" else 3257
    require(len(rows) == expected_rows, mode + " campaign row count")
    require(sum(row["cohort"] == current_cohort and not row.get("external_reference") for row in rows) == 3254, mode + " originals")
    require(sum(row.get("external_reference", False) for row in rows) == (2 if mode == "standard" else 3), mode + " annual refs")
    expected_policy = 150 if mode == "standard" else 0
    require(sum(row["classification"] == "pre_script_policy_rejection" for row in rows) == expected_policy, mode + " policy rows")
    return rows, {"mode": mode, "sources": sources, "outcomes": outcomes, "mapping": mapping, "paired": paired,
                   "referenceRoles": ["annual-standard-trxhzt-2023", "annual-standard-trxhzt-2025", "annual-standard-trxhzt-2026", "current-standard-trxhzt", "current-consensus-trxhzt", "current-standard-bare", "current-consensus-bare"]}

def schedules(rows):
    require(rows and rows[0]["mode"] in MODES, "campaign rows")
    result = []
    for process, (pack_order, direction) in enumerate(PROCESS_ORDERS):
        ordered = []
        for pack in pack_order:
            part = [row for row in rows if row["pack"] == pack]
            if direction == "reverse":
                part.reverse()
            ordered.extend(part)
        require(len(ordered) == len(rows) and len({row["registration_id"] for row in ordered}) == len(rows), "schedule roster")
        result.append({"process": process, "packOrder": list(pack_order), "withinPackDirection": direction, "rows": ordered})
    return result

def prospective_output_bound(rows):
    # A source-derived conservative bound. It retains two full vectors and
    # three evaluations; current stop-first prefixes are counted only as a
    # lower bound because the capture tail is intentionally unknown.
    schedules_data = schedules(rows)
    by_id = {row["registration_id"]: row for row in rows}
    estimates = []
    for schedule in schedules_data:
        one_prefix = sum(len(json.dumps(by_id[row["registration_id"]]["recorded_oracle"] or [], separators=(",", ":")).encode()) for row in schedule["rows"])
        vector_lower_bound = one_prefix * 2 * 3
        metadata_allowance = len(schedule["rows"]) * 3 * 1300
        estimates.append({"process": schedule["process"], "rows": len(schedule["rows"]), "prefixVectorLowerBoundBytes": vector_lower_bound,
                          "metadataAllowanceBytes": metadata_allowance, "estimatedMinimumBytes": vector_lower_bound + metadata_allowance})
    return {"streamCapBytes": 67108864, "metadataAllowancePerEmittedRow": 1300, "processes": estimates,
            "maxEstimatedMinimumBytes": max(item["estimatedMinimumBytes"] for item in estimates),
            "fullCaptureTailUnknown": True, "under64MiBBeforeCaptureTail": max(item["estimatedMinimumBytes"] for item in estimates) < 67108864}
