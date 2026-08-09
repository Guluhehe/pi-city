#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run export:experience
if [[ -x "$ROOT/.venv-visual/bin/python" ]]; then
  "$ROOT/.venv-visual/bin/python" "$ROOT/scripts/check_canonical_frames.py"
else
  python3 "$ROOT/scripts/check_canonical_frames.py"
fi
