#!/usr/bin/env bash
set -euo pipefail

browser="${1:?browser path required}"
base_url="${2:?base URL required}"
out_dir="${3:?output directory required}"
timeout_seconds="${WORLD_STORIES_GATE_TIMEOUT_SECONDS:-75}"

set +e
timeout --foreground --signal=TERM --kill-after=5s "${timeout_seconds}s" \
  node tools/capture-world-stories-gate.mjs "$browser" "$base_url" "$out_dir"
status=$?
set -e

if [[ "$status" -eq 124 || "$status" -eq 137 ]]; then
  echo "Canonical World Stories gate exceeded ${timeout_seconds}s; completed evidence before timeout:" >&2
  for file in \
    world-stories-canonical-event-1440x900.png \
    world-stories-canonical-follow-1440x900.png \
    world-stories-canonical-recovered-1440x900.png \
    world-stories-gate-evidence.json; do
    if [[ -f "$out_dir/$file" ]]; then
      echo "  present: $file" >&2
    else
      echo "  missing: $file" >&2
    fi
  done
  echo "Chrome runtime tail:" >&2
  tail -80 "$out_dir/world-stories-gate-chrome-runtime.log" >&2 || true
  exit 124
fi

exit "$status"
