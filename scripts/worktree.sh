#!/usr/bin/env bash

# Shared helpers: one Supabase stack backs every worktree of this repo.

common_git_dir() {
  local dir
  dir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
  # Empty/relative output means the flag itself was rejected (git < 2.31).
  case "$dir" in
  /*) printf '%s\n' "$dir" ;;
  *) echo "error: this repo's worktree tooling needs git 2.31+ (--path-format=absolute)" >&2; return 1 ;;
  esac
}

# git's porcelain list always puts the main worktree first; sub() (not field-splitting)
# keeps paths containing spaces intact.
primary_worktree() {
  git worktree list --porcelain | awk 'sub(/^worktree /, "") { print; exit }'
}

this_worktree() {
  git rev-parse --show-toplevel
}

in_primary_worktree() {
  [ "$(primary_worktree)" = "$(this_worktree)" ]
}

# A key file can exist but be an empty `[]` left by an interrupted mint; only a
# populated array (a real key, identified by its "kid") counts as usable.
has_signing_key() {
  grep -q '"kid"' "${1:-supabase/signing_keys.json}" 2>/dev/null
}

# Fail fast at source time so every caller inherits the git-version guarantee.
common_git_dir >/dev/null
