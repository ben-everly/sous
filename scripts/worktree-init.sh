#!/usr/bin/env bash
# Link gitignored local-dev files from the primary checkout into this worktree, so a
# fresh worktree boots against the same shared Supabase stack. signing_keys.json MUST
# match the running instance — a divergent key silently invalidates every session — so
# we symlink rather than copy, keeping all worktrees on one source of truth.
set -euo pipefail
# Exit quietly outside a git checkout: postinstall runs everywhere (CI, tarball installs).
toplevel=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$toplevel"
. scripts/worktree.sh

# Silent no-op in the primary checkout: nothing to link to.
in_primary_worktree && exit 0

primary=$(primary_worktree)

link() {
  local rel=$1 src="$primary/$1" dst="$PWD/$1"
  [ -e "$src" ] || { echo "skip $rel (not in primary checkout)"; return; }
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    cmp -s "$src" "$dst" || echo "WARNING: $rel differs from the primary checkout; delete it and rerun to share the primary's" >&2
    return
  fi
  ln -sfn "$src" "$dst"
  echo "linked $rel -> $src"
}

# Only .env is shared deliberately; .env.local and any future .env.* stay per-worktree
# so a stray secret file never auto-fans-out across checkouts.
link .env
link supabase/signing_keys.json
