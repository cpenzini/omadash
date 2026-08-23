#!/bin/sh
set -eu
cd /workspace
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# with-app-env.mjs lets a parent VITE_AUTH_ENABLED win over .grok/app-env.json.
# Drop a leaked value so the file (or its absence) is what Vite actually sees.
unset VITE_AUTH_ENABLED
npm run dev >>/tmp/app-startup.log 2>&1 &
