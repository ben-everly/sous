#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/worktree.sh
. "$(dirname "$0")/worktree.sh"

# Absolute common git dir, not a plain .git path — every worktree must resolve to the same file.
lock="$(common_git_dir)/.supabase-shared.lock"
holder_file=""

# Lock unconditionally, even for a lone worktree: another one can be added mid-run.
if command -v flock >/dev/null 2>&1; then
  # fd 9 auto-releases if this process dies, so a crash can't wedge the lock.
  exec 9>"$lock"
  holder_file="$lock.holder"
  if ! flock -n 9; then
    held_by=$(cat "$holder_file" 2>/dev/null) || true
    echo "waiting: shared Supabase stack in use${held_by:+ by $held_by}" >&2
    flock 9 || { echo "error: failed to acquire shared Supabase lock" >&2; exit 1; }
  fi
  # Best-effort and diagnostic only: a hard crash leaves this stale.
  printf '%s (%s)\n' "$(this_worktree)" "$*" >"$holder_file"
elif [ "${ALLOW_UNSERIALIZED_SUPABASE:-}" = "1" ]; then
  echo "WARNING: flock unavailable — running UNSERIALIZED. Safe only with a single worktree; a second concurrent worktree can corrupt the shared stack." >&2
else
  cat >&2 <<'EOF'
error: flock not found, so runs against the shared Supabase stack can't be serialized.
  Install it to run multiple worktrees safely: brew install flock (macOS).
  Or, if you use only a single worktree: export ALLOW_UNSERIALIZED_SUPABASE=1 to run without
  locking — but a second concurrent worktree can then corrupt the shared stack.
EOF
  exit 1
fi

# A self-locking wrapper checks this to re-exec through us exactly once instead of looping.
export WITH_SUPABASE_LOCK=1

# Run as a child, not exec'd, so this trap can still fire on exit; fd 9 stays open in
# this shell either way, so the lock covers the wrapped command's whole run regardless.
if [ -n "$holder_file" ]; then
  trap 'rm -f "$holder_file"' EXIT
  "$@"
else
  exec "$@"
fi
