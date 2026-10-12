# Experimental BLS verification time and operation costs

This study asks whether lower uniform instruction charges make useful contracts smaller while admitting acceptable validation work. Base 100 remains the reference; 50 and 20 are experimental. These measurements isolate identical artifacts. Reoptimized bytes, maximum accepted adversarial work, VM-attributable memory and full-limit block/mempool validation remain separate research gates. No replacement schedule is selected.

The compact committed fixture has challenge score **70,009** and **69,239 spending bytes**; the fixed alternative has score **79,948** and **79,178 spending bytes**. Both use 22 inputs. Six of ten original fixtures shrink and four grow, so compact remains a qualified Pareto alternative. No verifier source, witness, scoring, or admission limit changed in this timing study.

## Timing boundary and measurement conditions

The native steady-clock timer encloses complete all-input `VerifyScript` calls with actual signature checking. JSON/hex decoding, transaction-policy admission, context/precomputation/checker construction and one warm verification stay outside. Setup components and native-process elapsed walls are retained separately. Context and precomputation measurements are parts of cache total, not additional terms to sum onto it.

The run used an Apple M4 Max (14 logical CPUs, 36 GiB RAM), macOS 27.0/Darwin 27 arm64, Apple clang 21.0.0, crypto 3.6.5, boost filesystem/atomic 1.92.0 and gmpxx/gmp 6.3.0. Nice 15 and initial/block memory/thermal/process snapshots were recorded. They do not establish CPU affinity, isolation or constant clocks. Older crypto 3.6.1 or setup-inclusive measurements are not paired controls.

Six schedule permutations occur once, with three sequential processes each: 18 processes, six observations per base. Each of eight contexts has five evaluations of ten complete cached verifications: 720 rows/7,200 loops. Workload order is fixed; schedule order is counterbalanced. Every observation is retained. Values below are median(minimum–maximum) across six process means. Reference ratios are formed within each process and VM mode before aggregation, not from ratios of displayed medians.

## Absolute and relative verification time

| Base | Artifact / mode | Spending bytes | VerifyScript ms (range) | ns/byte (range) | Annual per byte (range) | Accepted bare per byte (range) |
|---:|---|---:|---:|---:|---:|---:|
| 100 | trxhzt:standard | 366 | 0.044220 (0.043675–0.045450) | 120.820792 (119.330601–124.180328) | 1.000000 (1.000000–1.000000) | 0.190001 (0.188720–0.192894) |
| 100 | trxhzt:consensus | 366 | 0.044377 (0.043511–0.045379) | 121.249973 (118.882022–123.986885) | 1.000000 (1.000000–1.000000) | 0.190535 (0.189685–0.192004) |
| 100 | l0fhm3:standard | 99988 | 63.503219 (63.045437–64.369768) | 635.108400 (630.530039–643.774936) | 5.263147 (5.184194–5.298857) | 1.000000 (1.000000–1.000000) |
| 100 | l0fhm3:consensus | 99988 | 63.551298 (62.663359–64.813034) | 635.589254 (626.708796–648.208127) | 5.248372 (5.208234–5.271910) | 1.000000 (1.000000–1.000000) |
| 100 | bls12381-70009:standard | 69239 | 4.097370 (3.955463–4.134387) | 59.177191 (57.127667–59.711819) | 0.486333 (0.471989–0.494648) | 0.092700 (0.090176–0.094127) |
| 100 | bls12381-70009:consensus | 69239 | 3.997356 (3.859053–4.041869) | 57.732721 (55.735255–58.375615) | 0.472816 (0.468828–0.477693) | 0.090235 (0.088929–0.091454) |
| 100 | bls12381-79948:standard | 79178 | 5.111266 (4.963960–5.255558) | 64.554117 (62.693678–66.376487) | 0.535138 (0.517976–0.539298) | 0.101433 (0.098962–0.103105) |
| 100 | bls12381-79948:consensus | 79178 | 5.118794 (4.987636–5.215817) | 64.649192 (62.992698–65.874569) | 0.531160 (0.529876–0.535373) | 0.101535 (0.100509–0.102497) |
| 50 | trxhzt:standard | 366 | 0.044372 (0.043858–0.046305) | 121.234044 (119.829290–126.516393) | 1.000000 (1.000000–1.000000) | 0.191930 (0.189615–0.197339) |
| 50 | trxhzt:consensus | 366 | 0.044849 (0.043436–0.046734) | 122.538689 (118.677104–127.688962) | 1.000000 (1.000000–1.000000) | 0.192870 (0.188810–0.201673) |
| 50 | l0fhm3:standard | 99988 | 63.345393 (62.673032–64.434381) | 633.529953 (626.805541–644.421139) | 5.210366 (5.067409–5.273841) | 1.000000 (1.000000–1.000000) |
| 50 | l0fhm3:consensus | 99988 | 63.259166 (62.713178–64.351134) | 632.667578 (627.207048–643.588572) | 5.185068 (4.958517–5.296327) | 1.000000 (1.000000–1.000000) |
| 50 | bls12381-70009:standard | 69239 | 4.062401 (3.895190–4.144270) | 58.672154 (56.257167–59.854561) | 0.479326 (0.465401–0.486326) | 0.092245 (0.089752–0.093361) |
| 50 | bls12381-70009:consensus | 69239 | 3.966491 (3.835542–4.076652) | 57.286945 (55.395694–58.877968) | 0.472849 (0.451403–0.476837) | 0.090548 (0.088321–0.091780) |
| 50 | bls12381-79948:standard | 79178 | 5.111573 (4.968847–5.251882) | 64.558000 (62.755395–66.330073) | 0.530894 (0.516428–0.538976) | 0.101913 (0.100119–0.102930) |
| 50 | bls12381-79948:consensus | 79178 | 5.095661 (4.957342–5.238489) | 64.357029 (62.610100–66.160918) | 0.531184 (0.507279–0.538627) | 0.102001 (0.099824–0.103132) |
| 20 | trxhzt:standard | 366 | 0.045917 (0.043704–0.047244) | 125.455355 (119.410328–129.082404) | 1.000000 (1.000000–1.000000) | 0.197524 (0.186595–0.202547) |
| 20 | trxhzt:consensus | 366 | 0.044653 (0.043468–0.047148) | 122.001393 (118.765956–128.818306) | 1.000000 (1.000000–1.000000) | 0.191276 (0.187508–0.200657) |
| 20 | l0fhm3:standard | 99988 | 63.724846 (62.701301–64.372845) | 637.324941 (627.088259–643.805707) | 5.063761 (4.937128–5.359196) | 1.000000 (1.000000–1.000000) |
| 20 | l0fhm3:consensus | 99988 | 63.917937 (62.572132–64.219175) | 639.256077 (625.796412–642.268822) | 5.228370 (4.983623–5.333115) | 1.000000 (1.000000–1.000000) |
| 20 | bls12381-70009:standard | 69239 | 4.073814 (3.950281–4.103163) | 58.836981 (57.052829–59.260869) | 0.469049 (0.457523–0.482483) | 0.092123 (0.088865–0.093104) |
| 20 | bls12381-70009:consensus | 69239 | 3.986253 (3.911283–4.047400) | 57.572364 (56.489587–58.455495) | 0.469075 (0.453783–0.486650) | 0.090740 (0.087953–0.091508) |
| 20 | bls12381-79948:standard | 79178 | 5.149189 (4.999670–5.210949) | 65.033080 (63.144686–65.813094) | 0.520075 (0.502836–0.540762) | 0.102229 (0.098354–0.103425) |
| 20 | bls12381-79948:consensus | 79178 | 5.133506 (4.977259–5.227684) | 64.835008 (62.861643–66.024453) | 0.525558 (0.512539–0.546606) | 0.102036 (0.097874–0.102845) |

VMLA annual `trxhzt` is 366 bytes/two real signature checks. Accepted 1-of-3 bare multisig `l0fhm3` is 99,988 bytes/873 inputs/2,619 real signature checks. Their absolute times above supply the measured denominators for every ratio; BLS itself uses no signature checks. This selected driver uses VMLA’s cached boundary and both required references; it does not replace complete-stock or maximum-admitted-work research.

## Paired schedule comparisons

| Artifact / mode | 50/100 time (range) | 20/100 time (range) |
|---|---:|---:|
| bls12381-70009:standard | 0.992934 (0.984762–1.005319) | 0.996560 (0.988635–0.998690) |
| bls12381-70009:consensus | 0.999813 (0.985466–1.010065) | 1.002034 (0.991738–1.013534) |
| bls12381-79948:standard | 1.000689 (0.989992–1.010177) | 1.008325 (0.991512–1.011767) |
| bls12381-79948:consensus | 1.000521 (0.987483–1.008805) | 1.000563 (0.997010–1.004894) |

These comparisons pair distinct processes in the same counterbalanced block; every numerator/denominator absolute time and process identity is retained. Seven of eight BLS ranges cross 1. Compact standard at base 20 is below 1 in all six pairs, median 0.996560/range 0.988635–0.998690. This finite observed direction does not establish significance, a causal speedup, a universal ceiling or an optimal schedule.

## Native resource controls and assurance scope

Before timing, three native resource processes accepted both canonical constructions in both modes at all three bases: 12 contexts/264 input records. Compact standard opcost is 42,971,161/37,177,311/33,701,001 at 100/50/20; fixed standard is 53,570,872/44,795,572/39,530,392. Lower accounting charges on unchanged artifacts are not CPU, fee or byte savings. The smallest observed input margin is 13,823 in compact base-100 standard input 4. Native DEFINE-body storage is included in those native costs; its 99,480 compact storage-accounting subtotal is not measured RAM.

These are supplied fixed-public-VK equation fixtures with synthetic prepared UTXOs, not circuit-generated proofs, independently generated setup or real funded transactions. The driver performs CheckRegularTransaction plus IsStandardTx/AreInputsStandard for standard mode and ordered VerifyScript calls. It does not establish CheckTxInputs, chain state, fees, mempool or live network admission. Explicit research flags are not network activation detection. Fiat-Shamir PIT, cofactor-equivalence, point-validation and arbitrary-witness/whole-graph qualifications remain.

Independent review of complete original timing/loader/readiness/cleanup evidence passed, including 8,133 arithmetic/metadata comparisons. The public package below preserves calculation inputs and exact emitted rows; it is a derived subset rather than a replacement for all original native provenance. Conditional input-5 accounting now includes its P2SH32 wrapper and budget under authenticated body/framing/numeric premises. It does not establish those premises universally or close all 22 inputs.

## Dataset and reproduction

The corpus, 18 native stdout streams, process/setup observations, counterbalanced plan, reporting code, source wrappers and original evidence hashes are supplied here. Run the reporting command with the actual SHA256 values of plan.json and manifest.json to recreate absolute/per-byte/reference/paired values from the recorded samples:

```sh
python3 summarize.py --plan plan.json --plan-sha PLAN_SHA256 \
  --run-dir . --raw-manifest manifest.json --raw-sha MANIFEST_SHA256 \
  --output /absolute/fresh/output-directory
```

For new measurements, a compatible native build must supply the pinned research VM rules and libraries. The portable source wrapper changes only the old private include location; it has not been rebuilt or validated as a fresh installation. Run each native cached binary as `cached_timing corpus.jsonl 5 10` under fresh host gates, preserving the plan order. New timing processes require their own measured annual/bare references, library binding, negative/acceptance controls, native resources and bounded cleanup. Published readiness metadata does not authorize a native run.

Original research/implementation: **GPT-6 Astra**, directed by Kallisti. Subsequent controlled timing and assurance work: **Codex**, directed by Kallisti. All findings remain experimental.

