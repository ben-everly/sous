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

# The main worktree is always git's first --porcelain entry, whatever the layout
# (--separate-git-dir, bare repo) — ask git rather than do path math on the common dir.
# sub() strips the prefix in place, so paths containing spaces survive intact.
primary_worktree() {
  git worktree list --porcelain | awk 'sub(/^worktree /, "") { print; exit }'
}

this_worktree() {
  git rev-parse --show-toplevel
}

in_primary_worktree() {
  [ "$(primary_worktree)" = "$(this_worktree)" ]
}

# Minting is two steps — seed `[]`, then append the key — so an interrupted run leaves an
# empty array that a plain `-f` test accepts as real, silently invalidating every session.
# Treat only a populated array (an actual JWK, identified by its "kid") as a usable key.
has_signing_key() {
  grep -q '"kid"' "${1:-supabase/signing_keys.json}" 2>/dev/null
}

# Fail fast at source time so every caller inherits the git-version guarantee.
common_git_dir >/dev/null
