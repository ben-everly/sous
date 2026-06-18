#!/usr/bin/env bash
# Hold a lock on the shared local Supabase stack while running a command. All worktrees
# share one stack (CLI keys containers by project_id), so concurrent stack operations
# (db:start/db:stop/db:reset/test:db/test:e2e) from different checkouts corrupt each other;
# a second run waits instead.
set -euo pipefail
# Run from this worktree's cwd (don't cd to the primary): the wrapped command operates here.
# shellcheck source=scripts/worktree.sh
. "$(dirname "$0")/worktree.sh"

# One lock every worktree shares, in the common git dir — a relative path would be
# cwd-keyed, so worktrees wouldn't share it.
lock="$(common_git_dir)/.supabase-shared.lock"

# flock (util-linux) is absent on stock macOS. Refuse rather than silently run unserialized:
# the failure mode is two worktrees corrupting the one shared stack, so make the gap opt-in.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock"
  holder_file="$lock.holder"
  # Probe first so a contended lock announces the wait instead of looking like a hang.
  if ! flock -n 9; then
    held_by=$(cat "$holder_file" 2>/dev/null) || true
    msg="waiting: shared Supabase stack in use${held_by:+ by $held_by}"
    if [ -t 2 ]; then
      # Spin only on a terminal — a redraw loop would spam \r into CI logs and pipes.
      # 9>&- keeps the decorative subshell off fd 9 so it can't hold the lock open; the
      # real flock stays in the foreground so fd 9's lock survives into exec.
      (
        frames='/-\|'
        i=0
        while :; do
          printf '\r%s %s' "$msg" "${frames:i++%4:1}" >&2
          sleep 0.1
        done
      ) 9>&- &
      spinner=$!
      # Without this, an interrupt mid-wait orphans the spinner and leaves its line on screen.
      trap 'kill "$spinner" 2>/dev/null || true; printf "\r\033[K" >&2; exit 130' INT TERM
      flock 9 || { kill "$spinner" 2>/dev/null || true; echo "error: failed to acquire shared Supabase lock" >&2; exit 1; }
      trap - INT TERM
      kill "$spinner" 2>/dev/null || true
      wait "$spinner" 2>/dev/null || true
      printf '\r\033[K' >&2 # erase the spinner line before the command's own output
    else
      echo "$msg" >&2
      flock 9 || { echo "error: failed to acquire shared Supabase lock" >&2; exit 1; }
    fi
  fi
  # Record who holds the lock so the next waiter can name us — best-effort, diagnostic only.
  # Never cleared, so a waiter may see a holder that has already finished, or (after a crash
  # mid-write) a partial line. The wait is correct regardless; this label is only a hint.
  printf '%s (%s)\n' "$(this_worktree)" "$*" >"$holder_file"
elif [ "${ALLOW_UNSERIALIZED_SUPABASE:-}" = "1" ]; then
  echo "WARNING: flock unavailable — running UNSERIALIZED; a concurrent worktree can corrupt the shared stack." >&2
else
  cat >&2 <<'EOF'
error: flock not found, so runs against the shared Supabase stack can't be serialized.
  Without it, two worktrees touching the stack at once can corrupt it.
  Fix: brew install flock (macOS), or set ALLOW_UNSERIALIZED_SUPABASE=1 to run anyway.
EOF
  exit 1
fi

# Signal to wrapped commands that they're already serialized, so a self-locking script
# (db-start.sh) re-execs through us exactly once instead of looping.
export WITH_SUPABASE_LOCK=1
exec "$@"
