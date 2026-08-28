#!/usr/bin/env bash
set -euo pipefail

node --check tools/capture-settlement-food-reserve-evidence.mjs
npm run pages:build

runner_temp="${RUNNER_TEMP:-/tmp}"
if command -v cygpath >/dev/null 2>&1; then
  runner_temp="$(cygpath -u "$runner_temp")"
fi
mkdir -p "$runner_temp"
log_file="$runner_temp/worldboxsr-settlement-reserve-qa.log"

npx vite preview --host 127.0.0.1 --port 4177 --strictPort > "$log_file" 2>&1 &
preview_pid=$!
cleanup() {
  kill "$preview_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 60); do
  if curl --silent --show-error --fail --max-time 1 http://127.0.0.1:4177/WorldBoxSR/ >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.2
done
if [ "$ready" -ne 1 ]; then
  echo "Vite preview did not become ready. Log: $log_file" >&2
  cat "$log_file" >&2 || true
  exit 2
fi

browser="${WORLDBOXSR_BROWSER:-}"
if [ -z "$browser" ]; then
  for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$candidate" >/dev/null 2>&1; then
      browser="$(command -v "$candidate")"
      break
    fi
  done
fi
if [ -z "$browser" ]; then
  echo 'Chrome/Chromium is not configured. Preflight must export WORLDBOXSR_BROWSER.' >&2
  exit 2
fi

node tools/capture-settlement-food-reserve-evidence.mjs "$browser" http://127.0.0.1:4177/WorldBoxSR/ artifacts/visual
