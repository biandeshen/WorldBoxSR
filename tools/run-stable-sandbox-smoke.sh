#!/usr/bin/env bash
set -euo pipefail

port="${STABLE_SANDBOX_QA_PORT:-4176}"
out_dir="${VISUAL_QA_OUT:-artifacts/visual}"
log_file="${STABLE_SANDBOX_QA_LOG:-${RUNNER_TEMP:-/tmp}/worldboxsr-stable-sandbox-qa.log}"
base_url="http://127.0.0.1:${port}/WorldBoxSR/"
scope="${VISUAL_QA_SCOPE:-full}"

case "$scope" in
  smoke|full) ;;
  *) echo "VISUAL_QA_SCOPE must be smoke or full, got: $scope" >&2; exit 2 ;;
esac

browser="${WORLDBOXSR_BROWSER:-}"
if [[ -z "$browser" ]]; then
  for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$candidate" >/dev/null 2>&1; then browser="$(command -v "$candidate")"; break; fi
  done
fi
if [[ -z "$browser" ]]; then echo "Stable Sandbox QA requires Chrome/Chromium; configure WORLDBOXSR_BROWSER on self-hosted runners" >&2; exit 2; fi

mkdir -p "$out_dir"
rm -f "$log_file"
node --check tools/capture-stable-sandbox-persistence-evidence.mjs
node --check tools/verify-stable-sandbox-evidence.mjs
if [[ ! -d .pages ]]; then npm run pages:build; fi

npx vite preview --host 127.0.0.1 --port "$port" --strictPort >"$log_file" 2>&1 &
preview_pid=$!
cleanup() { kill "$preview_pid" >/dev/null 2>&1 || true; wait "$preview_pid" >/dev/null 2>&1 || true; }
trap cleanup EXIT

for _ in $(seq 1 50); do
  if curl --silent --show-error --fail --max-time 1 "$base_url" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then cat "$log_file" >&2 || true; exit 1; fi
  sleep 0.2
done
curl --silent --show-error --fail "$base_url" >/dev/null

node tools/capture-stable-sandbox-persistence-evidence.mjs "$browser" "$base_url" "$out_dir"
if [[ "$scope" == "full" ]]; then
  node tools/verify-stable-sandbox-evidence.mjs "$out_dir"
fi
