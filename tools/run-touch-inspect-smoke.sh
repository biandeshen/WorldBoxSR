#!/usr/bin/env bash
set -euo pipefail

port="${TOUCH_QA_PORT:-4174}"
out_dir="${VISUAL_QA_OUT:-artifacts/visual}"
log_file="${TOUCH_QA_LOG:-/tmp/worldboxsr-touch-inspect-qa.log}"
base_url="http://127.0.0.1:${port}/WorldBoxSR/"

browser=""
for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then browser="$(command -v "$candidate")"; break; fi
done
if [[ -z "$browser" ]]; then echo "Touch QA requires Chrome/Chromium on PATH" >&2; exit 2; fi

mkdir -p "$out_dir"
rm -f "$log_file"
if [[ ! -d dist ]]; then npm run pages:build; fi
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
node tools/capture-touch-inspect-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-pinch-zoom-evidence.mjs "$browser" "$base_url" "$out_dir"
