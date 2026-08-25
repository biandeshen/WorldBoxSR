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
  if curl --silent --show-error --fail --max-time 1 "$base_url" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then cat "$log_file" >&2 || true; exit 1; fi
  sleep 0.2
done

curl --silent --show-error --fail "$base_url" >/dev/null

chrome_flags=(
  --headless=new --no-sandbox --disable-dev-shm-usage --hide-scrollbars
  --window-size=1440,900 --force-device-scale-factor=1 --run-all-compositor-stages-before-draw
  --virtual-time-budget=15000 --enable-webgl --ignore-gpu-blocklist --use-angle=swiftshader
  --enable-unsafe-swiftshader --enable-logging=stderr --log-level=0 "--user-data-dir=$user_data_dir"
)

candidate_dom="$out_dir/candidate-dom.html"
"$browser" "${chrome_flags[@]}" --dump-dom "$base_url" >"$candidate_dom" 2>"$out_dir/chrome-runtime.log"
if ! grep -q "$ready_marker" "$candidate_dom"; then
  echo "Fully warmed Phaser showcase marker not found in rendered DOM" >&2
  grep -oE '<div id="boot-status"[^>]*>[^<]*' "$candidate_dom" | head -1 >&2 || true
  grep -oE 'Renderer failed:[^<]*' "$candidate_dom" | head -3 >&2 || true
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

node tools/capture-meteor-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-story-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-focused-story-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-bookmark-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-chronicle-lenses-evidence.mjs "$browser" "$base_url" "$out_dir"
bash tools/run-world-stories-gate.sh "$browser" "$base_url" "$out_dir"
node tools/capture-natural-fauna-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.6 capability 2: keep the natural Living Ecology grazer world, pause it,
# explicitly spawn one Wolf through the authoritative hidden QA creature-spawn
# path, then prove the two species are visually/inspectably distinct while the
# paused read-only presentation path remains authority-neutral.
node tools/capture-multi-species-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.6 capability 3: in a fresh Living Ecology world, explicitly create one
# Wolf through that same hidden QA setup path, set the ordinary Time control to
# one day, real-click Play, and require actual daily simulation to move the Wolf
# and produce a causal Wolf→Grazer predation + death + feeding consequence.
node tools/capture-wolf-predation-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.6 capability 4: reuse the shipped predation authority in a fresh world,
# then require pure presentation/query surfaces to explain it: current behavior,
# vegetation utilization, live Pulse, Recent Chronicle and Causal Event Card.
node tools/capture-ecology-readability-evidence.mjs "$browser" "$base_url" "$out_dir"

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
focused_story_trail=story-focused-trail-1440x900.png
focused_story_event=story-focused-trail-event-opened-1440x900.png
focused_story_authority=focused-story-evidence.json
watchlist_pinned=story-watchlist-pinned-1440x900.png
watchlist_reloaded=story-watchlist-reloaded-1440x900.png
watchlist_authority=watchlist-evidence.json
chronicle_lenses=story-chronicle-lenses-1440x900.png
chronicle_lens_event=story-chronicle-lens-event-opened-1440x900.png
chronicle_lens_authority=chronicle-lenses-evidence.json
world_stories_canonical_event=world-stories-canonical-event-1440x900.png
world_stories_canonical_follow=world-stories-canonical-follow-1440x900.png
world_stories_canonical_recovered=world-stories-canonical-recovered-1440x900.png
world_stories_canonical_authority=world-stories-gate-evidence.json
natural_fauna=living-ecology-natural-fauna-1440x900.png
natural_fauna_authority=natural-fauna-evidence.json
multi_species=living-ecology-grazer-wolf-1440x900.png
multi_species_authority=multi-species-evidence.json
wolf_predation=living-ecology-wolf-predation-1440x900.png
wolf_predation_authority=wolf-predation-evidence.json
ecology_readability=living-ecology-readability-1440x900.png
ecology_readability_authority=ecology-readability-evidence.json
runtime_probe=${ready_marker}; Renderer failed absent; v0.4/v0.5 regressions plus v0.6 natural-fauna, Grazer/Wolf identity, real Wolf predation and ecology-readability gates preserve declared authority boundaries
EOF

printf 'Visual evidence captured with %s\n' "$browser"
