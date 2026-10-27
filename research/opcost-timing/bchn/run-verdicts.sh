#!/usr/bin/env bash
# Verdict + clock re-run (opcost-finalize): fresh node, anchors, sound-native chains incl. tampered proofs, the
# OP_DEFINE charge probe and a few VM-limits vectors. Records per-rep verdicts, BCHN's mempool script error for
# expected rejections (testmempoolaccept), and the node CPU's scaling_cur_freq every 0.5 s.
#   run-verdicts.sh NAME NODE_CPU DRIVER_CPU REPS
set -euo pipefail
NAME=${1:-rev3}; NODE_CPU=${2:-9}; DRV_CPU=${3:-8}; REPS=${4:-11}
HERE=$(cd "$(dirname "$0")" && pwd); BENCH=$(cd "$HERE/../../.." && pwd)
OPCOST_DIR=${OPCOST_DIR:-/home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing}
VMB=${VMB_DIR:-$OPCOST_DIR/ext/vmb_tests}
OUT=$OPCOST_DIR/raw/bchn-$NAME; mkdir -p "$OUT"
SIB=$(cat /sys/devices/system/cpu/cpu$NODE_CPU/topology/thread_siblings_list)
{
  echo "date: $(date -Is)"; echo "host: $(uname -srm)"
  lscpu | grep -E "Model name|Thread|Core|MHz"
  echo "governor(cpu$NODE_CPU): $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_governor) epp: $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/energy_performance_preference 2>/dev/null) boost: $(cat /sys/devices/system/cpu/cpufreq/boost 2>/dev/null)"
  echo "node cpu: $NODE_CPU (smt siblings $SIB) driver cpu: $DRV_CPU reps: $REPS"
  echo "loadavg start: $(cat /proc/loadavg)"
} > "$OUT/env.txt"
"$HERE/node.sh" start "$NAME" "$NODE_CPU" >> "$OUT/env.txt"
( while :; do echo "$(date +%s.%N) $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_cur_freq)"; sleep 0.5; done ) > "$OUT/freq.txt" &
SAMP=$!
SRCS=(--src builtin:baselines --src builtin:sound-native --src "json:$OPCOST_DIR/kernels/defcharge.json")
for f in "$VMB"/bch_2026_standard/*benchmarks*.vmb_tests.json "$VMB"/bch_2026_nonstandard/*benchmarks*.vmb_tests.json; do SRCS+=(--src "vmb:$f@accept"); done
cd "$BENCH"
BENCH_DIR="$BENCH" taskset -c "$DRV_CPU" npx tsx research/opcost-timing/bchn/run.ts --node "$NAME" "${SRCS[@]}" --reps "$REPS" \
  --filter "${FILTER:-^(base-op1|base-trxhzt-like|bch-groth16-\S+|defcharge-\S+|l0fhm3|trxhzt|w57j6w|ly54y8|u83yzg|09macl) }" --out "$OUT/results.jsonl" 2> "$OUT/run.log" || true
kill $SAMP || true
echo "loadavg end: $(cat /proc/loadavg)" >> "$OUT/env.txt"
"$HERE/node.sh" stop "$NAME"
