#!/usr/bin/env bash
# Run from any directory: ./run_seed.sh or bash /path/to/backend/run_seed.sh
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .venv/bin/activate ]]; then
  echo "Missing backend/.venv — create it and install deps first." >&2
  exit 1
fi
# shellcheck source=/dev/null
source .venv/bin/activate
exec python -m app.seed
