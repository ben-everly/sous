#!/usr/bin/env bash
# All git worktrees of this repo share ONE local Supabase stack — the CLI keys its
# Docker containers by `project_id`. Destructive commands (db:reset/db:stop) from any
# worktree therefore hit every worktree, so they are guarded; test:db/e2e are not
# destructive but do contend on the shared DB, so run them serially across worktrees.
# These helpers locate the primary checkout so callers can link shared dev files or
# refuse the destructive commands from a linked worktree.

# Absolute path of the primary checkout. `git worktree list` documents the main worktree
# as listed first; strip the `worktree ` prefix rather than field-splitting so paths with
# spaces survive.
primary_worktree() {
  git worktree list --porcelain | sed -n 's/^worktree //p' | head -1
}

this_worktree() {
  git rev-parse --show-toplevel
}

in_primary_worktree() {
  [ "$(primary_worktree)" = "$(this_worktree)" ]
}
