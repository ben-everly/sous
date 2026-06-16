#!/usr/bin/env bash
# Refuse a destructive Supabase command when run from a linked worktree: the local
# stack is shared across all worktrees, so reset/stop here disrupts every checkout.
# Override with FORCE_SHARED_SUPABASE=1 when that is genuinely the intent.
set -euo pipefail
# Nothing to guard outside a git checkout.
toplevel=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$toplevel"
. scripts/worktree.sh

in_primary_worktree && exit 0
[ "${FORCE_SHARED_SUPABASE:-}" = "1" ] && { echo "FORCE_SHARED_SUPABASE=1 — proceeding." >&2; exit 0; }

cat >&2 <<EOF
Refusing '${1:-this command}': it affects the shared local Supabase stack that every worktree uses.
  this worktree: $(this_worktree)
  primary:       $(primary_worktree)
EOF
if [ "${1:-}" = "db:keys" ]; then
  echo "Run 'npm run worktree:init' to link the primary's signing key into this worktree." >&2
else
  echo "Run it from the primary checkout, or set FORCE_SHARED_SUPABASE=1 to override." >&2
fi
exit 1
