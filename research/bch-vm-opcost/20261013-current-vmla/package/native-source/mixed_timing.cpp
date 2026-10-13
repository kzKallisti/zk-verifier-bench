// GPT-6.1 Sol: current/annual mixed capture and cached timing candidate.
// Prefix below reuses pinned classifier49b0ba73 decoder/cache/flag selection.
// Reuse the pinned native fixture decoder, flags and admission control.
// The owning build replaces its main object; frozen sources stay unchanged.
#define main historical_native_control_main
#include "/Users/kallisti/workshop/selene.cash/research/bch-vm-base-cost-10/experiments/20261012/vmla-cached-classification-AC-a1/native_control.cpp"
#undef main
#include <memory>
#include <optional>
#include <sstream>
#include <set>
#include <new>

using Clock = std::chrono::steady_clock;
static int64_t elapsed(Clock::time_point start) {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now() - start).count();
}

struct Cached {
    CTransaction tx;
    CCoinsView dummy;
    CCoinsViewCache coins{&dummy};
    std::vector<ScriptExecutionContext> contexts;
    std::optional<PrecomputedTransactionData> txdata;
    std::vector<std::unique_ptr<BaseSignatureChecker>> checkers;
    int64_t contextNs;
    int64_t precomputeNs;

    explicit Cached(const Fixture &fixture) : tx(fixture.tx) {
        auto start = Clock::now();
        for (size_t i = 0; i < fixture.utxos.size(); ++i)
            coins.AddCoin(tx.vin.at(i).prevout, Coin(fixture.utxos[i], 1, false), false);
        contexts = ScriptExecutionContext::createForAllInputs(tx, coins);
        contextNs = elapsed(start);
        start = Clock::now();
        txdata.emplace(contexts.at(0));
        for (const auto &ctx : contexts)
            checkers.push_back(std::make_unique<TransactionSignatureChecker>(ctx, *txdata));
        precomputeNs = elapsed(start);
        if (contexts.size() != tx.vin.size() || checkers.size() != contexts.size())
            throw std::runtime_error("Cached context shape mismatch");
    }

    std::vector<ScriptError> verifyInputs(uint32_t scriptFlags, bool stopAtFirstFailure) const {
        std::vector<ScriptError> outcomes;
        for (size_t i = 0; i < tx.vin.size(); ++i) {
            const auto &context = contexts[i];
            ScriptError error{};
            const bool accepted = VerifyScript(context.scriptSig(), context.coinScriptPubKey(),
                                               scriptFlags, *checkers[i], &error);
            if (accepted != (error == ScriptError::OK))
                throw std::runtime_error("VerifyScript status/error inconsistency");
            outcomes.push_back(error);
            if (!accepted && stopAtFirstFailure) break;
        }
        return outcomes;
    }
};

// Annual VMLA starts a fresh regtest chain at genesis. Unlike current-rules
// consensus, BIP65/BIP66/CSV heights have not activated in that block context.
static constexpr uint32_t annualBlockFlags = consensusFlags &
    ~(SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | SCRIPT_VERIFY_CHECKSEQUENCEVERIFY);
static_assert(flags == 535906287 && consensusFlags == 396445551, "Current contract drift");
static_assert(annualBlockFlags == 396444011, "Annual genesis flags drift");

static uint32_t selectFlags(const std::string &domain, const std::string &pack,
                            const std::string &mode) {
    uint32_t selected = mode == "standard" ? flags : consensusFlags;
    if (domain == "current-rules-projection") return selected;
    selected = mode == "standard" ? flags : annualBlockFlags;
    if (pack == "2023")
        selected &= ~(SCRIPT_ENABLE_MAY2025 | SCRIPT_ENABLE_MAY2026 | SCRIPT_VM_LIMITS_STANDARD);
    else if (pack == "2025")
        selected &= ~SCRIPT_ENABLE_MAY2026;
    return selected;
}

struct Row {
    std::string name, pack, mode;
    std::optional<std::string> annualExpectedError;
    Fixture fixture;
};

static Row decodeRow(const std::string &line, bool requireAnnualExpectation) {
    UniValue value;
    if (!value.read(line)) throw std::runtime_error("Invalid JSON row");
    const auto &object = value.get_obj();
    std::set<std::string> fields;
    for (const auto &field : object)
        if (!fields.insert(field.first).second) throw std::runtime_error("Duplicate JSON field");
    Row row;
    row.name = object.at("name").get_str();
    row.pack = object.at("pack").get_str();
    row.mode = object.at("mode").get_str();
    if (row.name.empty()) throw std::runtime_error("Empty name");
    if (row.pack != "2023" && row.pack != "2025" && row.pack != "2026")
        throw std::runtime_error("Unknown annual pack");
    if (row.mode != "standard" && row.mode != "consensus") throw std::runtime_error("Unknown mode");
    if (const auto *expected = object.locate("expected_error"); expected && !expected->isNull())
        row.annualExpectedError = expected->get_str();
    if (requireAnnualExpectation && (!row.annualExpectedError || row.annualExpectedError->empty()))
        throw std::runtime_error("Annual reproduction requires pinned expected_error metadata");
    if (!DecodeHexTx(row.fixture.tx, object.at("transaction").get_str()))
        throw std::runtime_error("Cannot decode transaction");
    const auto &hexUtxos = object.at("utxos").get_str();
    if (!IsHex(hexUtxos)) throw std::runtime_error("Invalid UTXO hex");
    const auto bytes = ParseHex(hexUtxos);
    VectorReader reader(SER_NETWORK, INIT_PROTO_VERSION, bytes, 0);
    reader >> row.fixture.utxos;
    if (!reader.empty()) throw std::runtime_error("Trailing UTXOs");
    if (row.fixture.tx.vin.empty() || row.fixture.utxos.size() != row.fixture.tx.vin.size())
        throw std::runtime_error("Invalid context shape");
    std::set<COutPoint> outpoints;
    for (size_t i = 0; i < row.fixture.tx.vin.size(); ++i) {
        if (!outpoints.insert(row.fixture.tx.vin[i].prevout).second)
            throw std::runtime_error("Duplicate input: official loader skips this case");
        if (Coin(row.fixture.utxos[i], 1, false).IsSpent())
            throw std::runtime_error("Spent/null supplied coin: invalid context");
    }
    return row;
}


#include <map>
#include <cassert>
#include <crypto/sha256.h>

// Source-derived stock all-input loop. Outcome vectors are never built here.
static int64_t measureMixedInputs(const Cached &cached, uint32_t scriptFlags,
                                 const std::string &name, int repetitions,
                                 std::map<std::string, ScriptError> &failures) {
    bool didFail = failures.find(name) != failures.end();
    const auto start = Clock::now();
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        for (size_t size = cached.tx.vin.size(), inputNum = 0; inputNum < size; ++inputNum) {
            const ScriptExecutionContext &context = cached.contexts[inputNum];
            const BaseSignatureChecker &checker = *cached.checkers[inputNum];
            ScriptError serror{};
            const bool ok = VerifyScript(context.scriptSig(), context.coinScriptPubKey(), scriptFlags, checker, &serror);
            if (!ok && !didFail) {
                didFail = true;
                const bool didInsert = failures.try_emplace(name, serror).second;
                assert(didInsert);
            }
        }
    }
    return elapsed(start);
}

static std::string payloadSha256(const std::vector<uint8_t> &bytes) {
    uint8_t hash[CSHA256::OUTPUT_SIZE];
    CSHA256().Write(bytes.data(), bytes.size()).Finalize(hash);
    return HexStr(std::begin(hash), std::end(hash));
}

static int boundedCount(const char *argument, int maximum) {
    const std::string text(argument);
    if (text.empty()) throw std::runtime_error("Empty count");
    int value = 0;
    for (const char c : text) {
        if (c < '0' || c > '9') throw std::runtime_error("Count must be a positive decimal integer");
        value = value * 10 + (c - '0');
        if (value > maximum) throw std::runtime_error("Count exceeds reviewed bound");
    }
    if (value < 1) throw std::runtime_error("Count must be positive");
    return value;
}

struct TimingMetadata {
    std::string id, sourceMode, role, provenance, scope, classification, firstError;
    std::optional<std::string> reason;
    int64_t sourceLine;
    UniValue sourceIdentity;
    bool supplemental;
    std::vector<std::string> errors;
};

static bool preScript(const std::string &classification) {
    return classification == "pre_script_structure_rejection" ||
           classification == "pre_script_context_rejection" ||
           classification == "pre_script_policy_rejection";
}

static TimingMetadata decodeMetadata(const UniValue::Object &object, const Row &row, bool timing) {
    TimingMetadata meta;
    meta.id = object.at("registration_id").get_str();
    meta.sourceLine = object.at("source_line").get_int64();
    meta.sourceMode = object.at("source_mode").get_str();
    meta.sourceIdentity = object.at("source_identity");
    meta.supplemental = object.at("supplemental").get_bool();
    meta.role = object.at("role").get_str();
    meta.provenance = object.at("oracle_provenance").get_str();
    meta.scope = object.at("oracle_scope").get_str();
    meta.classification = object.at("oracle_classification").get_str();
    if (!object.at("oracle_reason").isNull()) meta.reason = object.at("oracle_reason").get_str();
    if (meta.id.empty() || meta.sourceLine < 0 || meta.role.empty() || meta.provenance.empty() ||
        (meta.sourceMode != "standard" && meta.sourceMode != "consensus"))
        throw std::runtime_error("Invalid registration metadata");
    if (!meta.sourceIdentity.isNull()) {
        const auto &identity = meta.sourceIdentity.get_array();
        if (identity.size() != 4) throw std::runtime_error("Expected four-part source identity");
        for (const auto &part : identity)
            if (part.get_str().empty()) throw std::runtime_error("Empty source identity part");
    }
    if (timing ? meta.scope != "full-observed-all-input" :
        (meta.scope != "recorded-stop-first-prefix" && meta.scope != "recorded-full-all-input"))
        throw std::runtime_error("Oracle scope is incompatible with requested operation");
    const auto &oracle = object.at("oracle").get_array();
    if (preScript(meta.classification)) {
        if (!oracle.empty() || !meta.reason || meta.reason->empty() ||
            !object.at("expected_error").isNull())
            throw std::runtime_error("Pre-script oracle must have reason, empty vector and null expected_error");
        return meta;
    }
    if (meta.classification != "all_scripts_accepted" && meta.classification != "script_rejection")
        throw std::runtime_error("Unknown oracle classification");
    if (meta.reason || oracle.empty() || oracle.size() > row.fixture.tx.vin.size() ||
        ((timing || meta.scope == "recorded-full-all-input") && oracle.size() != row.fixture.tx.vin.size()))
        throw std::runtime_error("Invalid script oracle size/reason");
    meta.firstError = "OK";
    for (size_t i = 0; i < oracle.size(); ++i) {
        const auto &entry = oracle[i].get_obj();
        const std::string error = entry.at("error").get_str();
        const bool accepted = entry.at("accepted").get_bool();
        if (entry.at("index").get_int64() != int64_t(i) || error.empty() || accepted != (error == "No error"))
            throw std::runtime_error("Oracle index/status/error mismatch");
        if (!accepted && meta.firstError == "OK") {
            meta.firstError = error;
            if (meta.scope == "recorded-stop-first-prefix" && i + 1 != oracle.size())
                throw std::runtime_error("Stop-first oracle contains a tail after its first failure");
        }
        meta.errors.push_back(error);
    }
    const bool accepted = meta.firstError == "OK";
    if (accepted && oracle.size() != row.fixture.tx.vin.size())
        throw std::runtime_error("Accepted prefix cannot establish full acceptance");
    if ((meta.classification == "all_scripts_accepted") != accepted ||
        !row.annualExpectedError || *row.annualExpectedError != meta.firstError)
        throw std::runtime_error("Oracle classification/expected_error mismatch");
    return meta;
}

static UniValue::Array checkOutcomes(const std::vector<ScriptError> &observed,
                                    const TimingMetadata &meta, size_t inputCount) {
    if (observed.size() != inputCount) throw std::runtime_error("Incomplete observed input vector");
    std::string first = "OK";
    UniValue::Array output;
    for (size_t i = 0; i < observed.size(); ++i) {
        const std::string error = ScriptErrorString(observed[i]);
        if (i < meta.errors.size() && error != meta.errors[i])
            throw std::runtime_error("Observed input differs from oracle at " + std::to_string(i));
        if (observed[i] != ScriptError::OK && first == "OK") first = error;
        UniValue::Object item;
        item.emplace_back("index", i);
        item.emplace_back("accepted", observed[i] == ScriptError::OK);
        item.emplace_back("error", error);
        output.emplace_back(std::move(item));
    }
    if (first != meta.firstError) throw std::runtime_error("Observed first script error differs from oracle");
    return output;
}

int main(int argc, char **argv) {
    size_t lineNumber = 0;
    std::string currentId, phase = "arguments";
    try {
        const bool timing = argc == 5 && std::string(argv[1]) == "--timing";
        const bool capture = argc == 3 && std::string(argv[1]) == "--capture";
        if (!timing && !capture)
            throw std::runtime_error("usage: mixed_timing --capture CORPUS | --timing CORPUS EVALUATIONS REPETITIONS");
        const int evaluations = timing ? boundedCount(argv[3], 3) : 1;
        const int repetitions = timing ? boundedCount(argv[4], 2) : 0;
#ifdef NDEBUG
        throw std::runtime_error("Assertions must be enabled");
#endif
        if (may2025::OPCODE_COST != 100) throw std::runtime_error("Current mixed reference requires base100");
        ECC_Start();
        const ECCVerifyHandle handle;
        phase = "corpus-read";
        std::ifstream input(argv[2]);
        if (!input) throw std::runtime_error("Cannot open corpus");
        const auto loadStart = Clock::now();
        const std::string text((std::istreambuf_iterator<char>(input)), {});
        if (input.bad()) throw std::runtime_error("Corpus read failed");
        const auto corpusReadNs = elapsed(loadStart);
        std::istringstream lines(text);
        std::string line;
        std::set<std::string> ids;
        std::map<std::string, ScriptError> failures;
        while (std::getline(lines, line)) {
            ++lineNumber;
            if (lineNumber > 3257) throw std::runtime_error("Corpus exceeds 3257 registrations");
            currentId.clear();
            phase = "decode-and-oracle";
            const auto decodeStart = Clock::now();
            UniValue value;
            if (!value.read(line)) throw std::runtime_error("Cannot parse metadata");
            const auto &object = value.get_obj();
            const std::string domain = object.at("domain").get_str();
            const bool annual = domain == "official-annual-pack";
            if (!annual && domain != "current-rules-projection") throw std::runtime_error("Unknown domain");
            const Row row = decodeRow(line, annual);
            const auto meta = decodeMetadata(object, row, timing);
            currentId = meta.id;
            if (!ids.insert(meta.id).second) throw std::runtime_error("Duplicate registration id");
            const auto inputCount = row.fixture.tx.vin.size();
            const std::string &hexTx = object.at("transaction").get_str();
            const auto txBytes = GetSerializeSize(row.fixture.tx, PROTOCOL_VERSION);
            if (!IsHex(hexTx) || hexTx.size() / 2 != txBytes ||
                object.at("transaction_bytes").get_int64() != int64_t(txBytes))
                throw std::runtime_error("Spending transaction byte-length mismatch");
            const auto transactionData = ParseHex(hexTx);
            const auto utxoData = ParseHex(object.at("utxos").get_str());
            const std::string transactionHash = payloadSha256(transactionData);
            const std::string utxoHash = payloadSha256(utxoData);
            if (object.at("transaction_sha256").get_str() != transactionHash ||
                object.at("ordered_utxos_sha256").get_str() != utxoHash ||
                object.at("ordered_utxos_bytes").get_int64() != int64_t(utxoData.size()))
                throw std::runtime_error("Input payload hash/length mismatch");
            const uint32_t scriptFlags = selectFlags(domain, row.pack, row.mode);
            if (object.at("flags").get_int64() != int64_t(scriptFlags))
                throw std::runtime_error("Supplied flags differ from actual domain flags");
            const auto decodeNs = elapsed(decodeStart);
            std::string classification, reason;
            int64_t policyNs = 0, cacheNs = 0;
            phase = "structural-preflight";
            if (!annual) {
                const auto start = Clock::now();
                CValidationState state;
                if (!CheckRegularTransaction(CTransaction(row.fixture.tx), state)) {
                    classification = "pre_script_structure_rejection";
                    reason = state.GetRejectReason();
                }
                policyNs += elapsed(start);
            }
            std::unique_ptr<Cached> cached;
            if (classification.empty()) {
                phase = "cache-setup";
                const auto start = Clock::now();
                cached = std::make_unique<Cached>(row.fixture);
                cacheNs = elapsed(start);
                phase = "context-and-policy-preflight";
                const auto policyStart = Clock::now();
                bool coinsPreserved = true;
                for (const auto &context : cached->contexts)
                    coinsPreserved = coinsPreserved && !context.coin().IsSpent();
                if (!coinsPreserved) {
                    if (annual) throw std::runtime_error("Annual supplied coin omitted from cached context");
                    classification = "pre_script_context_rejection";
                    reason = "Coin cache omitted an unspendable supplied output";
                }
                if (classification.empty() && !annual && row.mode == "standard") {
                    bool policyOk = IsStandardTx(cached->tx, reason, scriptFlags);
                    if (policyOk && !AreInputsStandard(cached->tx, cached->coins, scriptFlags)) {
                        policyOk = false;
                        reason = "bad-txns-nonstandard-inputs";
                    }
                    if (!policyOk) classification = "pre_script_policy_rejection";
                }
                if (!annual) policyNs += elapsed(policyStart);
            }
            const bool admitted = classification.empty();
            if (admitted ? preScript(meta.classification) :
                (classification != meta.classification || !meta.reason || reason != *meta.reason))
                throw std::runtime_error("Actual admission classification/reason differs from oracle");
            if (admitted) classification = meta.classification;
            for (int evaluation = 0; evaluation < evaluations; ++evaluation) {
                UniValue::Array beforeJson, afterJson;
                int64_t preNs = 0, postNs = 0, verifyNs = 0;
                if (admitted) {
                    phase = "pre-control";
                    auto start = Clock::now();
                    const auto before = cached->verifyInputs(scriptFlags, false);
                    beforeJson = checkOutcomes(before, meta, inputCount);
                    preNs = elapsed(start);
                    if (timing) {
                        phase = "timed-all-inputs";
                        verifyNs = measureMixedInputs(*cached, scriptFlags, meta.id, repetitions, failures);
                        if (verifyNs <= 0) throw std::runtime_error("Nonpositive cached verification interval");
                    }
                    phase = "post-control";
                    start = Clock::now();
                    const auto after = cached->verifyInputs(scriptFlags, false);
                    afterJson = checkOutcomes(after, meta, inputCount);
                    if (before != after) throw std::runtime_error("Outcome vector changed across controls");
                    postNs = elapsed(start);
                    if (timing) {
                        const auto failure = failures.find(meta.id);
                        const std::string first = failure == failures.end() ? "OK" : ScriptErrorString(failure->second);
                        if (first != meta.firstError) throw std::runtime_error("Timed first-error differs from oracle");
                    }
                }
                UniValue::Object result;
                result.emplace_back("line", lineNumber);
                result.emplace_back("registration_id", meta.id);
                result.emplace_back("source_line", meta.sourceLine);
                result.emplace_back("source_mode", meta.sourceMode);
                result.emplace_back("source_identity", meta.sourceIdentity);
                result.emplace_back("supplemental", meta.supplemental);
                result.emplace_back("role", meta.role);
                result.emplace_back("oracle_provenance", meta.provenance);
                result.emplace_back("name", row.name);
                result.emplace_back("pack", row.pack);
                result.emplace_back("mode", row.mode);
                result.emplace_back("domain", domain);
                result.emplace_back("flags", scriptFlags);
                result.emplace_back("base_cost", may2025::OPCODE_COST);
                result.emplace_back("tx_bytes", txBytes);
                result.emplace_back("transaction_sha256", transactionHash);
                result.emplace_back("ordered_utxos_sha256", utxoHash);
                result.emplace_back("ordered_utxos_bytes", utxoData.size());
                result.emplace_back("timing_performed", timing && admitted);
                result.emplace_back("inputs", inputCount);
                result.emplace_back("evaluation", evaluation);
                result.emplace_back("repetitions", repetitions);
                result.emplace_back("accepted", admitted ? UniValue(meta.firstError == "OK") : UniValue());
                result.emplace_back("first_script_error", admitted ? UniValue(meta.firstError) : UniValue());
                result.emplace_back("input_attempts_per_iteration", admitted ? inputCount : 0);
                result.emplace_back("input_attempt_count_kind", "source-derived-all-input-loop-not-instrumented");
                result.emplace_back("pre_input_outcomes", beforeJson);
                result.emplace_back("post_input_outcomes", afterJson);
                result.emplace_back("cached_verify_nanoseconds", timing && admitted ? UniValue(verifyNs) : UniValue());
                result.emplace_back("corpus_read_nanoseconds", timing ? UniValue(corpusReadNs) : UniValue());
                result.emplace_back("json_hex_decode_nanoseconds", timing ? UniValue(decodeNs) : UniValue());
                result.emplace_back("cache_total_nanoseconds", timing && cached ? UniValue(cacheNs) : UniValue());
                result.emplace_back("coins_context_nanoseconds", timing && cached ? UniValue(cached->contextNs) : UniValue());
                result.emplace_back("precompute_checker_nanoseconds", timing && cached ? UniValue(cached->precomputeNs) : UniValue());
                result.emplace_back("pre_control_nanoseconds", timing && admitted ? UniValue(preNs) : UniValue());
                result.emplace_back("post_control_nanoseconds", timing && admitted ? UniValue(postNs) : UniValue());
                result.emplace_back("op_cost", UniValue());
                result.emplace_back("sigchecks", UniValue());
                result.emplace_back("hash_iters", UniValue());
                result.emplace_back("operation", timing ? "timing" : "capture");
                result.emplace_back("classification", classification);
                result.emplace_back("reason", admitted ? UniValue() : UniValue(reason));
                result.emplace_back("oracle_scope", meta.scope);
                result.emplace_back("known_prefix_inputs", meta.errors.size());
                result.emplace_back("observed_tail_inputs", admitted ? inputCount - meta.errors.size() : 0);
                result.emplace_back("untimed_control_passes", admitted ? 2 : 0);
                result.emplace_back("policy_preflight_nanoseconds", timing && !annual ? UniValue(policyNs) : UniValue());
                phase = "output";
                std::cout << UniValue::stringify(result) << '\n';
                if (!std::cout) throw std::runtime_error("Output failed");
            }
        }
        if (lineNumber == 0 || lines.bad()) throw std::runtime_error("Empty or incomplete corpus");
        return 0;
    } catch (const std::exception &error) {
        std::cerr << "line=" << lineNumber << " registration=" << currentId << " phase=" << phase << ": " << error.what() << '\n';
        return 1;
    }
}
