#!/usr/bin/env bash
# All git worktrees of this repo share ONE local Supabase stack — the CLI keys its
# Docker containers by `project_id`. Destructive commands (db:reset/db:stop) from any
# worktree therefore hit every worktree, so they are guarded; test:db/e2e are not
# destructive but do contend on the shared DB, so run them serially across worktrees.
# These helpers locate the primary checkout so callers can link shared dev files or
# refuse the destructive commands from a linked worktree.

# Resolve the shared common git dir, asserting git 2.31+. --path-format=absolute is
# required: from the primary, --git-common-dir alone returns a relative `.git`.
common_git_dir() {
  local dir
  dir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
  case "$dir" in
  /*) printf '%s\n' "$dir" ;;
  *) echo "error: this repo's worktree tooling needs git 2.31+ (--path-format=absolute)" >&2; return 1 ;;
  esac
}

# The common git dir lives in the primary checkout by construction, so its parent is
# the primary's root.
primary_worktree() {
  dirname "$(common_git_dir)"
}

this_worktree() {
  git rev-parse --show-toplevel
}

in_primary_worktree() {
  [ "$(primary_worktree)" = "$(this_worktree)" ]
}

# Fail fast at source time so every caller inherits the git-version guarantee.
common_git_dir >/dev/null
