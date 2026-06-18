#!/usr/bin/env bash
# Hold a lock on the shared local Supabase stack while running a command. All worktrees
# share one stack (CLI keys containers by project_id), so concurrent stack operations
# (db:start/db:stop/db:reset/test:db/test:e2e) from different checkouts corrupt each other;
# a second run waits instead.
set -euo pipefail

# One lock every worktree shares, in the common git dir. --path-format=absolute (git 2.31+):
# a relative path would be cwd-keyed, so worktrees wouldn't share it.
common="$(git rev-parse --path-format=absolute --git-common-dir)"
case "$common" in
/*) ;;
*) echo "error: this repo's worktree tooling needs git 2.31+ (--path-format=absolute)" >&2; exit 1 ;;
esac
lock="$common/.supabase-shared.lock"

# flock (util-linux) is absent on stock macOS. Refuse rather than silently run unserialized:
# the failure mode is two worktrees corrupting the one shared stack, so make the gap opt-in.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock"
  # Probe first so a contended lock announces the wait instead of looking like a hang.
  flock -n 9 || { echo "waiting: another worktree is using the shared Supabase stack…" >&2; flock 9; }
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

exec "$@"
