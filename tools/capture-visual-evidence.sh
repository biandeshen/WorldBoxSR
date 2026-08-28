#!/usr/bin/env bash
set -euo pipefail

port="${VISUAL_QA_PORT:-4173}"
out_dir="${VISUAL_QA_OUT:-artifacts/visual}"
log_file="${VISUAL_QA_LOG:-/tmp/worldboxsr-visual-qa.log}"
base_url="http://127.0.0.1:${port}/WorldBoxSR/"
ready_marker="Phaser 4 · authoritative simulation · showcase ready"
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
if [[ -z "$browser" ]]; then echo "Visual QA requires Chrome/Chromium; configure WORLDBOXSR_BROWSER on self-hosted runners" >&2; exit 2; fi

# Node evidence must receive the native executable path (for example Chrome.exe
# on Windows), while Git Bash may need the same path translated for direct
# shell execution. Never replace the native path with a Unix shim.
browser_shell="$browser"
if command -v cygpath >/dev/null 2>&1 && [[ "$browser" =~ ^[A-Za-z]:\\ ]]; then
  browser_shell="$(cygpath -u "$browser")"
fi

mkdir -p "$out_dir"
rm -f "$log_file"
npm run pages:build
npx vite preview --host 127.0.0.1 --port "$port" --strictPort >"$log_file" 2>&1 &
preview_pid=$!
user_data_dir="$(mktemp -d)"
cleanup() { kill "$preview_pid" >/dev/null 2>&1 || true; wait "$preview_pid" >/dev/null 2>&1 || true; rm -rf "$user_data_dir"; }
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
"$browser_shell" "${chrome_flags[@]}" --dump-dom "$base_url" >"$candidate_dom" 2>"$out_dir/chrome-runtime.log"
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

"$browser_shell" "${chrome_flags[@]}" --screenshot="$out_dir/phaser-seed45-1440x900.png" "$base_url" >/dev/null 2>>"$out_dir/chrome-runtime.log"
"$browser_shell" "${chrome_flags[@]}" --screenshot="$out_dir/legacy-seed45-1440x900.png" "${base_url}?renderer=legacy" >/dev/null 2>>"$out_dir/chrome-runtime.log"

# Every scope keeps a real God Power pointer journey and causal story navigation.
node tools/capture-meteor-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-story-evidence.mjs "$browser" "$base_url" "$out_dir"

if [[ "$scope" == "smoke" ]]; then
  # One real Scenario editor path keeps pointer→tile→authoritative command and
  # paused workspace interaction in the fast PR denominator without replaying
  # the entire historical release suite before every micro-merge.
  node tools/capture-scenario-setup-evidence.mjs "$browser" "$base_url" "$out_dir"
  cat >"$out_dir/README.txt" <<EOF
WorldBoxSR visual evidence
scope=smoke
commit=$(git rev-parse HEAD)
viewport=1440x900
candidate=${base_url}
legacy=${base_url}?renderer=legacy
seed=45
candidate_screenshot=phaser-seed45-1440x900.png
legacy_screenshot=legacy-seed45-1440x900.png
god_power_authority=god-power-evidence.json
story_authority=story-evidence.json
scenario_setup_authority=scenario-setup-evidence.json
runtime_probe=${ready_marker}; Renderer failed absent; real God Power, story navigation and Scenario Setup pointer/editor smoke passed
EOF
  printf 'Visual smoke evidence captured with %s\n' "$browser"
  exit 0
fi

node tools/capture-focused-story-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-bookmark-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-chronicle-lenses-evidence.mjs "$browser" "$base_url" "$out_dir"
bash tools/run-world-stories-gate.sh "$browser" "$base_url" "$out_dir"
node tools/capture-natural-fauna-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-multi-species-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-wolf-predation-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-ecology-readability-evidence.mjs "$browser" "$base_url" "$out_dir"
node tools/capture-canonical-ecology-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.7 capability 2: through the real existing Phaser pointer path, enter the
# visible paused Scenario Setup workspace, place Human/Grazer/Wolf, prove a
# rejected sea click is identity-neutral, rename, Clear via deterministic
# rematerialization, rebuild the same exact start, then Run and prove ordinary
# gameplay changes the world without rewriting the frozen recipe.
node tools/capture-scenario-setup-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.7 capability 3: author one visible Scenario, use Copy Link + Export JSON,
# open the generated scenario= link in a fresh Chrome profile, then import the
# same canonical JSON from another fresh ordinary world. All three starts must
# be byte-identical paused authority; one impassable JSON import must fail
# atomically without changing world, recipe, URL or visible boot status.
node tools/capture-scenario-portability-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.7 capability 4: start from a fresh shared Scenario, deliberately diverge it
# through ordinary Time + Meteor, Replay the exact source Recipe start while
# clearing stale story/selection presentation but preserving bookmark storage,
# then Fork/Edit by adding one real Human placement. The source Recipe must stay
# immutable and Replay of the frozen fork must return to the exact fork start.
node tools/capture-scenario-replay-fork-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.7 capability 5: one coherent release path starts from an ordinary world,
# authors Portable trio through visible Setup, Copy Links it into a fresh Chrome
# profile, then runs/diverges, Replays the exact source, Forks one fixed Human,
# runs/diverges again and Replays the exact fork. No new product semantics.
node tools/capture-canonical-scenario-builder-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.8 capability 3: keep the exact seed45 Y40 authority paused and use ordinary
# Alt-click inspection on one current ruler plus a clear settlement in the same
# polity. Both Inspector views must expose the same ruling-line identity and any
# retained current transition while JSON.stringify(world) remains unchanged.
node tools/capture-ruling-line-readability-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.8 capability 4: on the same deterministic exact-Y40 product surface, real
# Rule-lens/Event-Card clicks must expose one recorded descendant continuation
# and one recorded open-selection/new-line transition, follow an existing
# event/map reference, preserve Rule membership/order and never mutate authority.
node tools/capture-dynastic-world-stories-evidence.mjs "$browser" "$base_url" "$out_dir"

# v0.8 capability 5: compose the already-shipped ruling-line Inspector and
# Dynastic World Stories browser evidence into one release gate. This adds no
# new simulation or presentation behavior; it fails unless both production
# surfaces expose authoritative ruling-line facts and stay read-only.
node tools/verify-canonical-ruling-lines-evidence.mjs "$out_dir"

cat >"$out_dir/README.txt" <<EOF
WorldBoxSR visual evidence
scope=full
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
canonical_ecology_trough=living-ecology-canonical-trough-y40-1440x900.png
canonical_ecology_recovery=living-ecology-canonical-recovery-y50-1440x900.png
canonical_ecology_predation=living-ecology-canonical-predation-1440x900.png
canonical_ecology_authority=canonical-ecology-evidence.json
scenario_setup=scenario-setup-three-actions-1440x900.png
scenario_running_start=scenario-running-start-1440x900.png
scenario_setup_authority=scenario-setup-evidence.json
scenario_portable_share=scenario-portable-share-1440x900.png
scenario_portable_shared_start=scenario-portable-shared-start-1440x900.png
scenario_portable_imported=scenario-portable-imported-1440x900.png
scenario_portability_authority=scenario-portability-evidence.json
scenario_portability_export=Portable-trio.worldboxsr-scenario.json
scenario_replay_restored=scenario-replay-restored-1440x900.png
scenario_fork_editing=scenario-fork-editing-1440x900.png
scenario_fork_replayed=scenario-fork-replayed-1440x900.png
scenario_replay_fork_authority=scenario-replay-fork-evidence.json
scenario_canonical_authored_share=scenario-canonical-authored-share-1440x900.png
scenario_canonical_source_replayed=scenario-canonical-source-replayed-1440x900.png
scenario_canonical_fork_editing=scenario-canonical-fork-editing-1440x900.png
scenario_canonical_fork_replayed=scenario-canonical-fork-replayed-1440x900.png
scenario_canonical_authority=canonical-scenario-builder-evidence.json
ruling_line_ruler=ruling-line-ruler-inspector-1440x900.png
ruling_line_settlement=ruling-line-settlement-inspector-1440x900.png
ruling_line_authority=ruling-line-readability-evidence.json
dynastic_descendant=dynastic-descendant-event-card-1440x900.png
dynastic_new_line=dynastic-new-line-event-card-1440x900.png
dynastic_world_stories_authority=dynastic-world-stories-evidence.json
canonical_ruling_lines_authority=canonical-ruling-lines-evidence.json
runtime_probe=${ready_marker}; Renderer failed absent; v0.4/v0.5/v0.6/v0.7 regressions plus v0.8 ruling-line Inspector, Dynastic World Stories and canonical Ruling Lines release gate preserve declared authority ownership
EOF

printf 'Visual full evidence captured with %s\n' "$browser"
