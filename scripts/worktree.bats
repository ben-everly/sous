#!/usr/bin/env bats
# Behavioral tests for the shared-Supabase worktree guard — the logic that decides whether a
# destructive db:reset/db:stop may run. A guard that wrongly allows would let a linked worktree
# nuke the stack every checkout shares, so pin the invariant against the regression-prone scripts.

setup() {
  repo=$(git rev-parse --show-toplevel)
  tmp=$(mktemp -d)
  wt="$tmp/wt"
  git worktree add --detach "$wt" HEAD >/dev/null 2>&1
  # Test the working-tree scripts, not whatever HEAD happened to commit.
  cp "$repo/scripts/worktree.sh" "$repo/scripts/guard-shared-supabase.sh" "$wt/scripts/"
}

teardown() {
  git worktree remove --force "$wt" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}

@test "guard allows a destructive command in the primary checkout" {
  cd "$repo"
  run bash scripts/guard-shared-supabase.sh db:reset
  [ "$status" -eq 0 ]
}

@test "guard refuses a destructive command in a linked worktree" {
  cd "$wt"
  run bash scripts/guard-shared-supabase.sh db:reset
  [ "$status" -eq 1 ]
}

@test "FORCE_SHARED_SUPABASE=1 overrides the guard in a linked worktree" {
  cd "$wt"
  run env FORCE_SHARED_SUPABASE=1 bash scripts/guard-shared-supabase.sh db:reset
  [ "$status" -eq 0 ]
}

@test "db:keys refusal points at worktree:init, not the primary/FORCE remedy" {
  cd "$wt"
  run bash scripts/guard-shared-supabase.sh db:keys
  [ "$status" -eq 1 ]
  [[ "$output" == *"worktree:init"* ]]
}
