#!/usr/bin/env bash
# Link gitignored local-dev files from the primary checkout into this worktree, so a
# fresh worktree boots against the same shared Supabase stack. signing_keys.json MUST
# match the running instance — a divergent key silently invalidates every session — so
# we symlink rather than copy, keeping all worktrees on one source of truth.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
. scripts/worktree.sh

# No-op (and silent) in the primary checkout: there is nothing to link to, and this
# runs on every `npm install` via postinstall, including CI and fresh clones.
in_primary_worktree && exit 0

primary=$(primary_worktree)

link() {
  local rel=$1 src="$primary/$1" dst="$PWD/$1"
  [ -e "$src" ] || { echo "skip $rel (not in primary checkout)"; return; }
  [ -e "$dst" ] && [ ! -L "$dst" ] && { echo "skip $rel (real file present; not overwriting)"; return; }
  ln -sfn "$src" "$dst"
  echo "linked $rel -> $src"
}

for env in "$primary"/.env*; do
  [ -e "$env" ] || continue
  case "$env" in *.example) continue ;; esac
  link "$(basename "$env")"
done
link supabase/signing_keys.json
