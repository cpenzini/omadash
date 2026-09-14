#!/usr/bin/env bash
set -euo pipefail
app_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export GSETTINGS_BACKEND=memory
exec "$app_dir/build/omadash" "$@"
