#!/usr/bin/env bash
set -euo pipefail

# Install hops-xr-got-guidance to ~/.claude/ (global) or .claude/ (local)
#
# Usage:
#   ./install.sh          # install globally to ~/.claude/
#   ./install.sh --local  # install to .claude/ in current directory

TARGET="$HOME/.claude"

if [[ "${1:-}" == "--local" ]]; then
  TARGET="$(pwd)/.claude"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "Installing hops-xr-got-guidance..."
echo ""

for dir in skills agents commands; do
  if [[ -d "$SCRIPT_DIR/$dir" ]]; then
    mkdir -p "$TARGET/$dir"
    cp -r "$SCRIPT_DIR/$dir/"* "$TARGET/$dir/"
    count=$(ls -1 "$SCRIPT_DIR/$dir" | wc -l | tr -d ' ')
    echo "  $dir/ → $TARGET/$dir/ ($count items)"
  fi
done

echo ""
echo "✓ Installed to $TARGET"
echo ""
