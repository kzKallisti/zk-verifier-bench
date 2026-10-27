#!/usr/bin/env bash
# BCHN kernel run: fresh regtest node (stock v29.1.0, see ../bchn/node.sh), the built-in baselines and
# sound-native chains as anchors (comparable with the calibration runs), then every kernel/control pair.
#   [EXTRA_SRC="--src json:FILE"] run-bchn.sh NAME NODE_CPU DRIVER_CPU [REPS] [KERNELS_JSON]
set -euo pipefail
NAME=${1:?name}; NODE_CPU=${2:-9}; DRV_CPU=${3:-8}; REPS=${4:-11}
HERE=$(cd "$(dirname "$0")" && pwd); BENCH=$(cd "$HERE/../../.." && pwd)
OPCOST_DIR=${OPCOST_DIR:-/home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing}
KJ=${5:-$OPCOST_DIR/kernels/all-kernels.json}
OUT=$OPCOST_DIR/kernels/raw/bchn-$NAME; mkdir -p "$OUT"
{
  echo "date: $(date -Is)"; echo "host: $(uname -srm)"
  lscpu | grep -E "Model name|Thread|Core|MHz"
  echo "governor(cpu$NODE_CPU): $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_governor) driver: $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/scaling_driver) epp: $(cat /sys/devices/system/cpu/cpu$NODE_CPU/cpufreq/energy_performance_preference 2>/dev/null) boost: $(cat /sys/devices/system/cpu/cpufreq/boost 2>/dev/null)"
  echo "bchn: $($HOME/BCH-infra/bitcoin-cash-node-29.1.0/bin/bitcoind -version | head -1)"
  echo "node cpu: $NODE_CPU driver cpu: $DRV_CPU reps: $REPS kernels: $KJ ($(sha256sum "$KJ" | cut -c1-16))"
  echo "loadavg start: $(cat /proc/loadavg)"
} > "$OUT/env.txt"
"$BENCH/research/opcost-timing/bchn/node.sh" start "$NAME" "$NODE_CPU" >> "$OUT/env.txt"
cd "$BENCH"
BENCH_DIR="$BENCH" taskset -c "$DRV_CPU" npx tsx research/opcost-timing/bchn/run.ts --node "$NAME" \
  --src builtin:baselines --src builtin:sound-native --src "json:$KJ" ${EXTRA_SRC:-} \
  --reps "$REPS" --target-opcost 4e8 --max-copies 400 --out "$OUT/results.jsonl" 2> "$OUT/run.log" || true
echo "loadavg end: $(cat /proc/loadavg)" >> "$OUT/env.txt"
"$BENCH/research/opcost-timing/bchn/node.sh" stop "$NAME"
