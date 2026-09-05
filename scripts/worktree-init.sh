#!/usr/bin/env bash
set -euo pipefail
toplevel=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "worktree:init: not inside a git checkout — nothing to link" >&2; exit 0; }
cd "$toplevel"
. scripts/worktree.sh

in_primary_worktree && exit 0

primary=$(primary_worktree)

link() {
  local rel=$1 src="$primary/$1" dst="$PWD/$1"
  [ -e "$src" ] || { echo "skip $rel (not in primary checkout)"; return; }
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    echo "WARNING: $rel is not symlinked from the primary checkout. Delete it and rerun to link" >&2
    return
  fi
  mkdir -p "$(dirname "$dst")"
  ln -sfn "$src" "$dst"
  echo "linked $rel -> $src"
}

link .env

# per-machine extra files (CLAUDE.local.md, .claude/settings.local.json, ...).
# one relative path per line, blank lines and #-comments skipped.
if [ -f "$primary/.worktree-links.local" ]; then
  while IFS= read -r rel || [ -n "$rel" ]; do
    case "$rel" in '' | '#'*) continue ;; esac
    link "$rel"
  done <"$primary/.worktree-links.local"
fi

# Warn loudly instead of relying on link's quiet skip: a missing key doesn't fail
# the build, it silently breaks auth.
if has_signing_key "$primary/supabase/signing_keys.json"; then
  link supabase/signing_keys.json
else
  echo "WARNING: supabase/signing_keys.json missing or empty in the primary checkout — auth will silently fail until you run 'npm run db:start' there and rerun 'npm run worktree:init'" >&2
fi
