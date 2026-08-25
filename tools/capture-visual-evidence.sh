#!/usr/bin/env bash
set -euo pipefail

port="${VISUAL_QA_PORT:-4173}"
out_dir="${VISUAL_QA_OUT:-artifacts/visual}"
log_file="${VISUAL_QA_LOG:-/tmp/worldboxsr-visual-qa.log}"
base_url="http://127.0.0.1:${port}/WorldBoxSR/"
ready_marker="Phaser 4 · authoritative simulation · showcase ready"

browser=""
for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    browser="$(command -v "$candidate")"
    break
  fi
done

if [[ -z "$browser" ]]; then
  echo "Visual QA requires Chrome/Chromium on PATH" >&2
  exit 2
fi

mkdir -p "$out_dir"
rm -f "$log_file"

npm run pages:build
npx vite preview --host 127.0.0.1 --port "$port" --strictPort >"$log_file" 2>&1 &
preview_pid=$!
user_data_dir="$(mktemp -d)"

cleanup() {
  kill "$preview_pid" >/dev/null 2>&1 || true
  wait "$preview_pid" >/dev/null 2>&1 || true
  rm -rf "$user_data_dir"
}
trap cleanup EXIT

for _ in $(seq 1 50); do
  if curl --silent --show-error --fail --max-time 1 "$base_url" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    cat "$log_file" >&2 || true
    exit 1
  fi
  sleep 0.2
done

curl --silent --show-error --fail "$base_url" >/dev/null

chrome_flags=(
  --headless=new
  --no-sandbox
  --disable-dev-shm-usage
  --hide-scrollbars
  --window-size=1440,900
  --force-device-scale-factor=1
  --run-all-compositor-stages-before-draw
  --virtual-time-budget=15000
  --enable-webgl
  --ignore-gpu-blocklist
  --use-angle=swiftshader
  --enable-unsafe-swiftshader
  --enable-logging=stderr
  --log-level=0
  "--user-data-dir=$user_data_dir"
)

candidate_dom="$out_dir/candidate-dom.html"
"$browser" "${chrome_flags[@]}" --dump-dom "$base_url" >"$candidate_dom" 2>"$out_dir/chrome-runtime.log"

if ! grep -q "$ready_marker" "$candidate_dom"; then
  echo "Fully warmed Phaser showcase marker not found in rendered DOM" >&2
  echo "Rendered boot status:" >&2
  grep -oE '<div id="boot-status"[^>]*>[^<]*' "$candidate_dom" | head -1 >&2 || true
  echo "Renderer failure markers:" >&2
  grep -oE 'Renderer failed:[^<]*' "$candidate_dom" | head -3 >&2 || true
  echo "Chrome log tail:" >&2
  tail -120 "$out_dir/chrome-runtime.log" >&2 || true
  exit 1
fi

if grep -q "Renderer failed:" "$candidate_dom"; then
  echo "Renderer failure marker found in rendered DOM" >&2
  grep -oE 'Renderer failed:[^<]*' "$candidate_dom" | head -3 >&2 || true
  exit 1
fi

"$browser" "${chrome_flags[@]}" --screenshot="$out_dir/phaser-seed45-1440x900.png" "$base_url" >/dev/null 2>>"$out_dir/chrome-runtime.log"
"$browser" "${chrome_flags[@]}" --screenshot="$out_dir/legacy-seed45-1440x900.png" "${base_url}?renderer=legacy" >/dev/null 2>>"$out_dir/chrome-runtime.log"

# v0.4 regression: exercise the real god-hand loop rather than merely prove
# buttons render. The helper uses real browser pointer events on one paused
# authoritative world: Meteor damage followed by same-footprint Rain recovery.
node tools/capture-meteor-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.5 World Stories gate: on a fresh paused seed45 world, click a real visible
# Chronicle event whose recorded causes include a retained event and a current
# map-capable entity. Require the richer Event Card, follow the retained event,
# jump to the related world object, and prove navigation leaves world state
# byte-identical under JSON serialization.
node tools/capture-story-evidence.mjs "$browser" "$base_url" "$out_dir"

cat >"$out_dir/README.txt" <<EOF
WorldBoxSR visual evidence
commit=$(git rev-parse HEAD)
viewport=1440x900
candidate=${base_url}
legacy=${base_url}?renderer=legacy
seed=45
candidate_screenshot=phaser-seed45-1440x900.png
legacy_screenshot=legacy-seed45-1440x900.png
meteor_target_preview=meteor-target-preview-1440x900.png
meteor_impact=meteor-impact-1440x900.png
rain_target_preview=rain-target-preview-1440x900.png
rain_recovery=rain-recovery-1440x900.png
god_power_aftermath=god-power-aftermath-chronicle-1440x900.png
god_power_authority=god-power-evidence.json
god_power_dom=god-power-dom.html
story_event_card=story-causal-event-card-1440x900.png
story_event_cause=story-event-cause-opened-1440x900.png
story_map_navigation=story-map-reference-navigation-1440x900.png
story_authority=story-evidence.json
runtime_probe=${ready_marker}; Renderer failed marker absent; v0.4 real-pointer damage/recovery plus v0.5 causal Event Card/event-ref/map-ref navigation with authoritative world fingerprint unchanged
EOF

printf 'Visual evidence captured with %s\n' "$browser"
