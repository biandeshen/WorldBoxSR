#!/usr/bin/env bash
set -euo pipefail

log_file=/tmp/worldboxsr-dev.log
health_url=http://127.0.0.1:8080/

rm -f "$log_file"
nohup env HOST=0.0.0.0 PORT=8080 npm run dev >"$log_file" 2>&1 &
server_pid=$!

for _ in $(seq 1 40); do
  if curl --silent --show-error --fail --max-time 1 "$health_url" >/dev/null 2>&1; then
    echo "WorldBoxSR preview ready on port 8080 (pid=$server_pid)"
    exit 0
  fi

  if ! kill -0 "$server_pid" 2>/dev/null; then
    break
  fi

  sleep 0.25
done

echo "WorldBoxSR preview failed to become ready on port 8080" >&2
if [[ -f "$log_file" ]]; then
  cat "$log_file" >&2
fi
exit 1
