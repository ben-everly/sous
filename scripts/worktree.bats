#!/usr/bin/env bats
# Behavioral tests for the shared-Supabase worktree guard — the logic that decides whether a
# destructive db:reset/db:stop may run. A guard that wrongly allows would let a linked worktree
# nuke the stack every checkout shares, so pin the invariant against the regression-prone scripts.

setup() {
  scripts="$BATS_TEST_DIRNAME"
  tmp=$(mktemp -d)
  primary="$tmp/primary"
  mkdir -p "$primary/scripts"
  # Commit the working-tree scripts (not whatever HEAD holds) into a throwaway repo, so the
  # test never registers a worktree against — or reads — the developer's real checkout.
  cp "$scripts/worktree.sh" "$scripts/guard-shared-supabase.sh" "$primary/scripts/"
  git -C "$primary" init -q
  git -C "$primary" add -A
  git -C "$primary" -c user.email=t@example.com -c user.name=test commit -q -m init
  wt="$tmp/wt"
  git -C "$primary" worktree add -q --detach "$wt" HEAD
}

teardown() {
  git -C "$primary" worktree remove --force "$wt" 2>/dev/null || true
  rm -rf "$tmp"
}

@test "guard allows a destructive command in the primary checkout" {
  cd "$primary"
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
