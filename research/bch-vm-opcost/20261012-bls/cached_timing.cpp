// Reuse the pinned native fixture decoder, flags and admission control.
// The owning build replaces its main object; frozen sources stay unchanged.
#define main historical_native_control_main
#include "native_opcost_control.cpp"
#undef main
#include <memory>
#include <optional>
#include <sstream>

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

    void verifyAll(uint32_t scriptFlags) const {
        // Same accepted-script loop boundary as VMLA RunBench: no decoding,
        // policy checks, UTXO/cache construction or signature precomputation.
        for (size_t inputNum = 0; inputNum < tx.vin.size(); ++inputNum) {
            const auto &context = contexts[inputNum];
            const auto &checker = *checkers[inputNum];
            ScriptError error{};
            if (!VerifyScript(context.scriptSig(), context.coinScriptPubKey(), scriptFlags, checker, &error))
                throw std::runtime_error(std::string("Cached positive rejected: ") + ScriptErrorString(error));
        }
    }
};

int main(int argc, char **argv) {
    try {
        if (argc != 4) throw std::runtime_error("usage: cached_timing CORPUS_JSONL EVALUATIONS REPETITIONS");
        const int evaluations = std::stoi(argv[2]), repetitions = std::stoi(argv[3]);
        if (evaluations < 1 || evaluations > 5 || repetitions < 1 || repetitions > 100)
            throw std::runtime_error("Timing counts exceed bounded plan");
        ECC_Start();
        const ECCVerifyHandle handle;
        std::ifstream input(argv[1]);
        if (!input) throw std::runtime_error("Cannot open corpus");
        auto loadStart = Clock::now();
        const std::string text((std::istreambuf_iterator<char>(input)), {});
        const auto corpusReadNs = elapsed(loadStart);
        std::istringstream lines(text);
        std::string line;
        while (std::getline(lines, line)) {
            const auto decodeStart = Clock::now();
            UniValue row;
            if (!row.read(line)) throw std::runtime_error("Cannot parse fixture row");
            const auto &object = row.get_obj();
            Fixture fixture;
            if (!DecodeHexTx(fixture.tx, object.at("transaction").get_str()))
                throw std::runtime_error("Cannot decode transaction");
            const auto bytes = ParseHex(object.at("utxos").get_str());
            VectorReader reader(SER_NETWORK, INIT_PROTO_VERSION, bytes, 0);
            reader >> fixture.utxos;
            if (!reader.empty()) throw std::runtime_error("Trailing UTXOs");
            const auto decodeNs = elapsed(decodeStart);
            const auto mode = object.at("mode").get_str();
            if (mode != "standard" && mode != "consensus") throw std::runtime_error("Unknown mode");
            const uint32_t scriptFlags = mode == "standard" ? flags : consensusFlags;
            const auto admissionStart = Clock::now();
            const auto admission = verify(fixture, scriptFlags, false);
            const auto admissionNs = elapsed(admissionStart);
            if (!admission.accepted) throw std::runtime_error("Positive admission control rejected");
            auto cacheStart = Clock::now();
            const Cached cached(fixture);
            const auto cacheNs = elapsed(cacheStart);
            cached.verifyAll(scriptFlags); // Explicit warm call, outside all timed evaluations.
            for (int evaluation = 0; evaluation < evaluations; ++evaluation) {
                const auto start = Clock::now();
                for (int repetition = 0; repetition < repetitions; ++repetition)
                    cached.verifyAll(scriptFlags);
                const auto verifyNs = elapsed(start);
                UniValue::Object result;
                result.emplace_back("name", object.at("name").get_str());
                result.emplace_back("mode", mode);
                result.emplace_back("flags", scriptFlags);
                result.emplace_back("base_cost", may2025::OPCODE_COST);
                result.emplace_back("tx_bytes", GetSerializeSize(fixture.tx, PROTOCOL_VERSION));
                result.emplace_back("inputs", fixture.tx.vin.size());
                result.emplace_back("accepted", true);
                result.emplace_back("sigchecks", admission.sigchecks);
                result.emplace_back("evaluation", evaluation);
                result.emplace_back("repetitions", repetitions);
                result.emplace_back("cached_verify_nanoseconds", verifyNs);
                result.emplace_back("corpus_read_nanoseconds", corpusReadNs);
                result.emplace_back("json_hex_decode_nanoseconds", decodeNs);
                result.emplace_back("admission_control_nanoseconds", admissionNs);
                result.emplace_back("cache_total_nanoseconds", cacheNs);
                result.emplace_back("coins_context_nanoseconds", cached.contextNs);
                result.emplace_back("precompute_checker_nanoseconds", cached.precomputeNs);
                std::cout << UniValue::stringify(result) << '\n';
            }
        }
        return 0;
    } catch (const std::exception &error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
