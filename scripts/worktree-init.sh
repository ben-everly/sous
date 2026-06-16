#!/usr/bin/env bash
# Link gitignored local-dev files from the primary checkout into this worktree, so a
# fresh worktree boots against the same shared Supabase stack. signing_keys.json MUST
# match the running instance — a divergent key silently invalidates every session — so
# we symlink rather than copy, keeping all worktrees on one source of truth.
set -euo pipefail
# Nothing to link outside a git checkout.
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

# A missing signing key is the one silent footgun: the app still boots, but every session
# silently invalidates. Warn loudly instead of relying on link's quiet stdout skip.
if [ -e "$primary/supabase/signing_keys.json" ]; then
  link supabase/signing_keys.json
else
  echo "WARNING: supabase/signing_keys.json not in the primary checkout — auth will silently fail until you run 'npm run db:start' there and rerun 'npm run worktree:init'" >&2
fi
