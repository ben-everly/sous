#!/usr/bin/env bash
# Hold a lock on the shared local Supabase stack while running a command. All worktrees
# share one stack (CLI keys containers by project_id), so concurrent stack operations
# (db:start/db:stop/db:reset/test:db/test:e2e) corrupt each other; a second run waits instead.
set -euo pipefail
# Run from this worktree's cwd (don't cd to the primary): the wrapped command operates here.
# shellcheck source=scripts/worktree.sh
. "$(dirname "$0")/worktree.sh"

# One lock every worktree shares, in the common git dir — a relative path would be
# cwd-keyed, so worktrees wouldn't share it.
lock="$(common_git_dir)/.supabase-shared.lock"
holder_file="" # set only on the locked path; gates the cleanup trap below

# Always lock when flock is present — no worktree-count shortcut, so a worktree added mid-run
# can't race an in-flight command. flock (util-linux) is absent on stock macOS; without it we
# can't serialize, so refuse unless the caller opts into an unserialized (single-worktree) run.
# The lock lives on fd 9 and auto-releases when this process dies, so a crash can't wedge it.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock"
  holder_file="$lock.holder"
  # Probe first so a contended lock announces the wait instead of looking like a hang.
  if ! flock -n 9; then
    held_by=$(cat "$holder_file" 2>/dev/null) || true
    echo "waiting: shared Supabase stack in use${held_by:+ by $held_by}" >&2
    flock 9 || { echo "error: failed to acquire shared Supabase lock" >&2; exit 1; }
  fi
  # Record who holds the lock so the next waiter can name us — best-effort, diagnostic only,
  # cleared on release by the EXIT trap. Only a hard crash leaves a stale or partial line.
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

# Signal to wrapped commands that they're already serialized, so a self-locking script
# (db-start.sh) re-execs through us exactly once instead of looping.
export WITH_SUPABASE_LOCK=1

# Clear the holder label on release so the next waiter never names a holder that already
# finished. This needs the command as a child (not exec) so the trap can fire; fd 9 stays
# open in this shell, so the lock is held for the command's whole run regardless.
if [ -n "$holder_file" ]; then
  trap 'rm -f "$holder_file"' EXIT
  "$@"
else
  exec "$@"
fi
