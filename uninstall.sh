#!/usr/bin/env bash
set -euo pipefail

# Uninstall hops-xr-got-guidance from ~/.claude/ (global) or .claude/ (local)
#
# Usage:
#   ./uninstall.sh          # uninstall from ~/.claude/
#   ./uninstall.sh --local  # uninstall from .claude/ in current directory

TARGET="$HOME/.claude"

if [[ "${1:-}" == "--local" ]]; then
  TARGET="$(pwd)/.claude"
fi

SKILLS=(hops-xr-got-guidance hops-xr-core hops-xr-got-template-structure hops-xr-got-observed-state
  hops-xr-got-template-patterns hops-xr-got-status-output hops-xr-labels hops-xr-external-names hops-xr-usages
  hops-xr-got-template-simplification hops-xr-got-helm-pattern hops-xr-testing hops-xr-observed-resources
  hops-xr-makefile hops-xr-github-workflows hops-xr-renovate hops-xr-gitops-package hops-xr-readme)

AGENTS=(hops-xr-orchestrator hops-xr-got-template-structure hops-xr-got-observed-state hops-xr-got-template-patterns
  hops-xr-got-status-output hops-xr-labels hops-xr-external-names hops-xr-usages hops-xr-got-template-simplification
  hops-xr-got-helm-pattern hops-xr-testing hops-xr-observed-resources hops-xr-makefile hops-xr-github-workflows
  hops-xr-renovate hops-xr-gitops-package hops-xr-readme)

COMMANDS=(hops-crossplane hops-xr-new hops-xr-validate hops-xr-checklist hops-xr-got-simplify hops-xr-audit)

# --- Dry run: show what will be removed ---

echo ""
echo "The following will be removed from $TARGET:"
echo ""

found=0

echo "  Skills:"
for dir in "${SKILLS[@]}"; do
  if [[ -d "$TARGET/skills/$dir" ]]; then
    echo "    $TARGET/skills/$dir/"
    found=$((found + 1))
  fi
done

echo ""
echo "  Agents:"
for file in "${AGENTS[@]}"; do
  if [[ -f "$TARGET/agents/$file.md" ]]; then
    echo "    $TARGET/agents/$file.md"
    found=$((found + 1))
  fi
done

echo ""
echo "  Commands:"
for file in "${COMMANDS[@]}"; do
  if [[ -f "$TARGET/commands/$file.md" ]]; then
    echo "    $TARGET/commands/$file.md"
    found=$((found + 1))
  fi
done

echo ""

if [[ $found -eq 0 ]]; then
  echo "Nothing to remove."
  exit 0
fi

echo "$found items will be removed."
echo ""
read -rp "Continue? [y/N] " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""

# --- Remove ---

removed=0

for dir in "${SKILLS[@]}"; do
  if [[ -d "$TARGET/skills/$dir" ]]; then
    rm -rf "$TARGET/skills/$dir"
    removed=$((removed + 1))
  fi
done

for file in "${AGENTS[@]}"; do
  if [[ -f "$TARGET/agents/$file.md" ]]; then
    rm -f "$TARGET/agents/$file.md"
    removed=$((removed + 1))
  fi
done

for file in "${COMMANDS[@]}"; do
  if [[ -f "$TARGET/commands/$file.md" ]]; then
    rm -f "$TARGET/commands/$file.md"
    removed=$((removed + 1))
  fi
done

echo "✓ Removed $removed items from $TARGET"
echo ""
