#include <coins.h>
#include <consensus/tx_check.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <hash.h>
#include <key.h>
#include <policy/policy.h>
#include <pubkey.h>
#include <script/interpreter.h>
#include <streams.h>
#include <univalue.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <validation.h>
#include <version.h>

#include <fstream>
#include <functional>
#include <chrono>
#include <iostream>
#include <iterator>
#include <stdexcept>

static constexpr uint32_t flags = STANDARD_SCRIPT_VERIFY_FLAGS | SCRIPT_ENABLE_P2SH_32
    | SCRIPT_ENABLE_TOKENS | SCRIPT_ENABLE_MAY2025 | SCRIPT_ENABLE_MAY2026 | SCRIPT_VM_LIMITS_STANDARD;
// GetNextBlockScriptFlags after all mainnet upgrades through Upgrade12 excludes
// these four policy-only flags; the other current standard flags are consensus.
static constexpr uint32_t consensusFlags = flags & ~(SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS
    | SCRIPT_DISALLOW_SEGWIT_RECOVERY | SCRIPT_VERIFY_INPUT_SIGCHECKS | SCRIPT_VM_LIMITS_STANDARD);
// The narrow executable does not link the node's validation globals. This
// stock policy default is irrelevant to these P2PKH/P2SH32-only outputs.
bool fIsBareMultisigStd = DEFAULT_PERMIT_BAREMULTISIG;
const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

struct Fixture {
    CMutableTransaction tx;
    std::vector<CTxOut> utxos;
};

struct Result {
    bool accepted = false;
    ScriptError error = ScriptError::UNKNOWN;
    int64_t cost = 0;
    int64_t budget = 0;
    int sigchecks = 0;
    int64_t hashiters = 0;
    UniValue::Array inputs;
};

static Result verify(const Fixture &fixture, uint32_t scriptFlags = flags, bool collectInputs = true) {
    const CTransaction tx(fixture.tx);
    CValidationState state;
    if (!CheckRegularTransaction(tx, state)) throw std::runtime_error(state.GetRejectReason());
    if (fixture.utxos.size() != tx.vin.size()) throw std::runtime_error("UTXO count mismatch");
    CCoinsView dummy;
    CCoinsViewCache coins(&dummy);
    for (size_t i = 0; i < fixture.utxos.size(); ++i)
        coins.AddCoin(tx.vin[i].prevout, Coin(fixture.utxos[i], 1, false), false);
    if (scriptFlags & SCRIPT_VM_LIMITS_STANDARD) {
        std::string policyReason;
        if (!IsStandardTx(tx, policyReason, scriptFlags))
            throw std::runtime_error("Transaction policy failure: " + policyReason);
        if (!AreInputsStandard(tx, coins, scriptFlags)) throw std::runtime_error("Input policy failure");
    }
    const auto contexts = ScriptExecutionContext::createForAllInputs(tx, coins);
    Result result;
    result.accepted = true;
    for (const auto &input : tx.vin)
        result.budget += may2025::detail::GetInputOpCostLimit(input.scriptSig.size());
    for (size_t i = 0; i < contexts.size(); ++i) {
        const PrecomputedTransactionData txdata(contexts[i]);
        const TransactionSignatureChecker checker(contexts[i], txdata);
        ScriptExecutionMetrics metrics;
        const bool accepted = VerifyScript(tx.vin[i].scriptSig, fixture.utxos[i].scriptPubKey,
                          scriptFlags, checker, metrics, &result.error);
        if (collectInputs) {
            UniValue::Object input;
            input.emplace_back("index", i);
            input.emplace_back("accepted", accepted);
            input.emplace_back("error", ScriptErrorString(result.error));
            input.emplace_back("unlocking_bytes", tx.vin[i].scriptSig.size());
            input.emplace_back("budget", may2025::detail::GetInputOpCostLimit(tx.vin[i].scriptSig.size()));
            input.emplace_back("op_cost", accepted ? UniValue(metrics.GetCompositeOpCost(scriptFlags)) : UniValue());
            input.emplace_back("base_op_cost", accepted ? UniValue(metrics.GetBaseOpCost()) : UniValue());
            input.emplace_back("sigchecks", accepted ? UniValue(metrics.GetSigChecks()) : UniValue());
            input.emplace_back("hash_iters", accepted ? UniValue(metrics.GetHashDigestIterations()) : UniValue());
            result.inputs.push_back(std::move(input));
        }
        if (!accepted) {
            result.accepted = false;
            return result;
        }
        result.cost += metrics.GetCompositeOpCost(scriptFlags);
        result.sigchecks += metrics.GetSigChecks();
        result.hashiters += metrics.GetHashDigestIterations();
    }
    return result;
}

static Fixture baseline(const std::string &path) {
    std::ifstream input(path);
    if (!input) throw std::runtime_error("Cannot open baseline fixture");
    const std::string json((std::istreambuf_iterator<char>(input)), {});
    UniValue root;
    if (!root.read(json)) throw std::runtime_error("Cannot parse baseline fixture");
    const auto &row = root.get_array().at(0).get_array();
    Fixture fixture;
    if (!DecodeHexTx(fixture.tx, row.at(4).get_str())) throw std::runtime_error("Cannot decode baseline transaction");
    const auto bytes = ParseHex(row.at(5).get_str());
    VectorReader reader(SER_NETWORK, INIT_PROTO_VERSION, bytes, 0);
    reader >> fixture.utxos;
    if (!reader.empty()) throw std::runtime_error("Trailing baseline UTXO bytes");
    return fixture;
}

static Fixture workload(int64_t iterations, bool function) {
    CScript redeem;
    if (function) redeem << std::vector<uint8_t>{OP_1SUB} << OP_2 << OP_DEFINE;
    redeem << ScriptInt::fromIntUnchecked(iterations) << OP_BEGIN;
    if (function) redeem << OP_2 << OP_INVOKE;
    else redeem << OP_1SUB;
    redeem << OP_DUP << OP_NOT << OP_UNTIL << OP_DROP << OP_1;
    // The P2SH32 input always carries the same 1000-byte redeem script, so its
    // byte-derived budget does not change as the loop count changes.
    redeem.resize(1000, static_cast<uint8_t>(OP_NOP));
    const auto digest = Hash(redeem);
    CScript locking;
    locking << OP_HASH256 << std::vector<uint8_t>(digest.begin(), digest.end()) << OP_EQUAL;
    Fixture fixture;
    fixture.tx.nVersion = 2;
    fixture.tx.vin.emplace_back(COutPoint(TxId(uint256S("01")), 0), CScript() << std::vector<uint8_t>(redeem.begin(), redeem.end()));
    fixture.tx.vout.emplace_back(90000 * SATOSHI, locking);
    fixture.utxos.emplace_back(100000 * SATOSHI, locking);
    return fixture;
}

static void emit(const std::string &name, const Fixture &fixture, const Result &result,
                 int64_t iterations = 0, uint32_t scriptFlags = flags) {
    UniValue::Object row;
    row.emplace_back("name", name);
    row.emplace_back("base_cost", may2025::OPCODE_COST);
    row.emplace_back("flags", scriptFlags);
    row.emplace_back("mode", scriptFlags & SCRIPT_VM_LIMITS_STANDARD ? "standard" : "consensus");
    row.emplace_back("iterations", iterations);
    row.emplace_back("accepted", result.accepted);
    row.emplace_back("error", ScriptErrorString(result.error));
    // VerifyScript publishes metrics only on success. Failed-input accounting
    // is unavailable through this API, so it must not appear as a measured zero.
    row.emplace_back("op_cost", result.accepted ? UniValue(result.cost) : UniValue());
    row.emplace_back("budget", result.budget);
    row.emplace_back("sigchecks", result.accepted ? UniValue(result.sigchecks) : UniValue());
    row.emplace_back("hash_iters", result.accepted ? UniValue(result.hashiters) : UniValue());
    row.emplace_back("inputs", result.inputs);
    row.emplace_back("tx_bytes", GetSerializeSize(fixture.tx, PROTOCOL_VERSION));
    row.emplace_back("transaction", EncodeHexTx(CTransaction(fixture.tx)));
    std::vector<uint8_t> utxos;
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, utxos, 0) << fixture.utxos;
    row.emplace_back("utxos", HexStr(utxos));
    std::cout << UniValue::stringify(row) << '\n';
}

static void replay(const std::string &path, int evaluations = 0, int repetitions = 0) {
    std::ifstream input(path);
    if (!input) throw std::runtime_error("Cannot open replay corpus");
    std::string line;
    while (std::getline(input, line)) {
        UniValue row;
        if (!row.read(line)) throw std::runtime_error("Cannot parse replay row");
        const auto &object = row.get_obj();
        Fixture fixture;
        if (!DecodeHexTx(fixture.tx, object.at("transaction").get_str()))
            throw std::runtime_error("Cannot decode replay transaction");
        const auto bytes = ParseHex(object.at("utxos").get_str());
        VectorReader reader(SER_NETWORK, INIT_PROTO_VERSION, bytes, 0);
        reader >> fixture.utxos;
        if (!reader.empty()) throw std::runtime_error("Trailing replay UTXO bytes");
        const auto name = object.at("name").get_str();
        const auto mode = object.at("mode").get_str();
        if (mode != "standard" && mode != "consensus") throw std::runtime_error("Unknown replay mode");
        const auto scriptFlags = mode == "standard" ? flags : consensusFlags;
        auto result = verify(fixture, scriptFlags);
        if (!evaluations) {
            emit(name, fixture, result, object.at("iterations").get_int64(), scriptFlags);
            continue;
        }
        // Timing includes the stock transaction checks, policy checks, UTXO
        // cache/context preparation, and signature/script execution each time.
        // It is deliberately distinct from node block or mempool timing.
        for (int evaluation = 0; evaluation < evaluations; ++evaluation) {
            const auto start = std::chrono::steady_clock::now();
            for (int repetition = 0; repetition < repetitions; ++repetition) {
                const auto measured = verify(fixture, scriptFlags, false);
                if (measured.accepted != result.accepted || measured.error != result.error)
                    throw std::runtime_error("Unstable replay result");
            }
            const auto duration = std::chrono::steady_clock::now() - start;
            UniValue::Object measured;
            measured.emplace_back("name", name);
            measured.emplace_back("base_cost", may2025::OPCODE_COST);
            measured.emplace_back("mode", mode);
            measured.emplace_back("flags", scriptFlags);
            measured.emplace_back("evaluation", evaluation);
            measured.emplace_back("repetitions", repetitions);
            measured.emplace_back("accepted", result.accepted);
            measured.emplace_back("error", ScriptErrorString(result.error));
            measured.emplace_back("tx_bytes", GetSerializeSize(fixture.tx, PROTOCOL_VERSION));
            measured.emplace_back("nanoseconds", std::chrono::duration_cast<std::chrono::nanoseconds>(duration).count());
            std::cout << UniValue::stringify(measured) << '\n';
        }
    }
}

int main(int argc, char **argv) {
    try {
        if (argc != 2 && argc != 3 && argc != 5)
            throw std::runtime_error("usage: native_opcost_control BASELINE_JSON | --replay CORPUS_JSONL | --measure CORPUS_JSONL EVALUATIONS REPETITIONS");
        ECC_Start();
        const ECCVerifyHandle handle;
        if (argc == 3 && std::string(argv[1]) == "--replay") {
            replay(argv[2]);
            return 0;
        }
        if (argc == 5 && std::string(argv[1]) == "--measure") {
            const int evaluations = std::stoi(argv[3]), repetitions = std::stoi(argv[4]);
            if (evaluations < 1 || repetitions < 1) throw std::runtime_error("Positive timing counts required");
            replay(argv[2], evaluations, repetitions);
            return 0;
        }
        if (argc != 2) throw std::runtime_error("Unknown command");
        for (const auto scriptFlags : {flags, consensusFlags}) {
            const auto mode = scriptFlags == flags ? "standard." : "consensus.";
            auto p2pkh = baseline(argv[1]);
            const auto p2pkhResult = verify(p2pkh, scriptFlags);
            if (!p2pkhResult.accepted || p2pkhResult.sigchecks != 2)
                throw std::runtime_error("P2PKH baseline failed real signature gate");
            emit(std::string(mode) + "p2pkh", p2pkh, p2pkhResult, 0, scriptFlags);
            // Corrupt the first ECDSA signature; this must fail under every schedule.
            p2pkh.tx.vin[0].scriptSig[10] ^= 1;
            const auto badSignature = verify(p2pkh, scriptFlags);
            if (badSignature.accepted) throw std::runtime_error("Invalid signature accepted");
            emit(std::string(mode) + "p2pkh_invalid_signature", p2pkh, badSignature, 0, scriptFlags);
            for (const bool function : {false, true}) {
                const auto name = function ? "function" : "loop";
                int64_t low = 1, high = 50000;
                if (!verify(workload(low, function), scriptFlags).accepted) throw std::runtime_error("Tiny loop/function failed");
                if (verify(workload(high, function), scriptFlags).accepted) throw std::runtime_error("Search bound did not reject");
                while (high - low > 1) {
                    const auto middle = (low + high) / 2;
                    const auto result = verify(workload(middle, function), scriptFlags);
                    if (result.accepted) low = middle;
                    else {
                        if (result.error != ScriptError::OP_COST)
                            throw std::runtime_error(std::string("Unexpected loop failure: ") + ScriptErrorString(result.error));
                        high = middle;
                    }
                }
                const auto accepted = workload(low, function);
                const auto rejected = workload(high, function);
                const auto acceptedResult = verify(accepted, scriptFlags);
                const auto rejectedResult = verify(rejected, scriptFlags);
                if (!acceptedResult.accepted || rejectedResult.accepted || rejectedResult.error != ScriptError::OP_COST)
                    throw std::runtime_error("Budget boundary gate failed");
                emit(std::string(mode) + name + "_accepted_boundary", accepted, acceptedResult, low, scriptFlags);
                emit(std::string(mode) + name + "_rejected_boundary", rejected, rejectedResult, high, scriptFlags);
            }
        }
        return 0;
    } catch (const std::exception &error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
