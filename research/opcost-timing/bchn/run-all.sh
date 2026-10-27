#!/usr/bin/env bash
# Full BCHN calibration run: fresh node, baselines + sound-native chains + all 2026 VM-limits benchmark vectors.
#   run-all.sh NAME NODE_CPU DRIVER_CPU REPS
set -euo pipefail
NAME=${1:-run1}; NODE_CPU=${2:-9}; DRV_CPU=${3:-5}; REPS=${4:-11}
HERE=$(cd "$(dirname "$0")" && pwd); BENCH=$(cd "$HERE/../../.." && pwd)
OPCOST_DIR=${OPCOST_DIR:-/home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing}
VMB=${VMB_DIR:-$OPCOST_DIR/ext/vmb_tests}
OUT=$OPCOST_DIR/raw/bchn-$NAME; mkdir -p "$OUT"
{
  echo "date: $(date -Is)"; echo "host: $(uname -srm)"
  lscpu | grep -E "Model name|Thread|Core|MHz"
  echo "governor(cpu$NODE_CPU): $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_governor) driver: $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_driver) epp: $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/energy_performance_preference 2>/dev/null) boost: $(cat /sys/devices/system/cpu/cpufreq/boost 2>/dev/null)"
  echo "bchn: $($HOME/BCH-infra/bitcoin-cash-node-29.1.0/bin/bitcoind -version | head -1)"
  echo "node cpu: $NODE_CPU driver cpu: $DRV_CPU reps: $REPS"
  echo "vmb_tests: $(git -C "$VMB" log -1 --format='%H %cd')"
  echo "loadavg start: $(cat /proc/loadavg)"
} > "$OUT/env.txt"
"$HERE/node.sh" start "$NAME" "$NODE_CPU" >> "$OUT/env.txt"
SRCS=(--src builtin:baselines --src builtin:sound-native)
for f in "$VMB"/bch_2026_standard/*benchmarks*.vmb_tests.json "$VMB"/bch_2026_nonstandard/*benchmarks*.vmb_tests.json; do SRCS+=(--src "vmb:$f@accept"); done
cd "$BENCH"
BENCH_DIR="$BENCH" taskset -c "$DRV_CPU" npx tsx research/opcost-timing/bchn/run.ts --node "$NAME" "${SRCS[@]}" --reps "$REPS" --out "$OUT/results.jsonl" 2> "$OUT/run.log" || true
echo "loadavg end: $(cat /proc/loadavg)" >> "$OUT/env.txt"
"$HERE/node.sh" stop "$NAME"
