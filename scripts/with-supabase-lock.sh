#!/usr/bin/env bash
# Hold a lock on the shared local Supabase stack while running a command. All worktrees
# share one stack (CLI keys containers by project_id), so concurrent stack operations
# (db:start/db:stop/db:reset/test:db/test:e2e) from different checkouts corrupt each other;
# a second run waits instead.
set -euo pipefail

# One lock every worktree shares, in the common git dir. --path-format=absolute (git 2.31+):
# a relative path would be cwd-keyed, so worktrees wouldn't share it.
lock="$(git rev-parse --path-format=absolute --git-common-dir)/.supabase-shared.lock"

# flock (util-linux) is absent on stock macOS; degrade rather than block work.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock"
  # Probe first so a contended lock announces the wait instead of looking like a hang.
  flock -n 9 || { echo "waiting: another worktree is using the shared Supabase stack…" >&2; flock 9; }
else
  echo "note: flock unavailable — not serializing shared-Supabase access across worktrees" >&2
fi

exec "$@"
