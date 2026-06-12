#!/usr/bin/env bash
# Shared helpers for worktree-aware scripts.
#
# All git worktrees of this repo share ONE local Supabase stack — the CLI keys its
# Docker containers by `project_id`, so reset/stop/test from any worktree hits every
# worktree. These helpers locate the primary checkout and detect linked worktrees so
# callers can link shared dev files or refuse destructive commands.

# Absolute path of the primary checkout (the dir containing the common .git).
primary_worktree() {
  local common
  common=$(git rev-parse --git-common-dir)
  [ "${common#/}" = "$common" ] && common="$(pwd)/$common"
  (cd "$(dirname "$common")" && pwd)
}

# Absolute path of the current worktree's root.
this_worktree() {
  git rev-parse --show-toplevel
}

in_primary_worktree() {
  [ "$(primary_worktree)" = "$(this_worktree)" ]
}
