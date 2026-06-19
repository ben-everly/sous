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
  cp "$scripts/worktree.sh" "$scripts/guard-shared-supabase.sh" \
    "$scripts/with-supabase-lock.sh" "$primary/scripts/"
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

@test "has_signing_key accepts a populated key file" {
  cd "$primary"
  . scripts/worktree.sh
  printf '[\n  { "kid": "abc123" }\n]\n' >key.json
  run has_signing_key key.json
  [ "$status" -eq 0 ]
}

@test "has_signing_key rejects an empty-array stub or a missing file" {
  cd "$primary"
  . scripts/worktree.sh
  printf '[]\n' >stub.json
  run has_signing_key stub.json
  [ "$status" -ne 0 ]
  run has_signing_key absent.json
  [ "$status" -ne 0 ]
}

@test "with-supabase-lock clears the holder file after the command finishes" {
  cd "$wt"
  run bash scripts/with-supabase-lock.sh true
  [ "$status" -eq 0 ]
  common=$(git rev-parse --path-format=absolute --git-common-dir)
  [ ! -e "$common/.supabase-shared.lock.holder" ]
}

@test "with-supabase-lock preserves the wrapped command's exit code" {
  cd "$wt"
  run bash scripts/with-supabase-lock.sh bash -c 'exit 3'
  [ "$status" -eq 3 ]
}

@test "a lone checkout still takes the lock (no worktree-count skip)" {
  lone="$tmp/lone"
  mkdir -p "$lone/scripts"
  cp "$scripts/worktree.sh" "$scripts/with-supabase-lock.sh" "$lone/scripts/"
  git -C "$lone" init -q
  git -C "$lone" add -A
  git -C "$lone" -c user.email=t@example.com -c user.name=test commit -q -m init
  cd "$lone"
  run bash scripts/with-supabase-lock.sh true
  [ "$status" -eq 0 ]
  [ -e "$lone/.git/.supabase-shared.lock" ]
}

# flock is installed in CI/dev, so stub a PATH without it to exercise the no-flock branches.
nobin_path() {
  local bin="$tmp/$1"
  mkdir -p "$bin"
  local t
  for t in dirname git cat grep; do ln -s "$(command -v "$t")" "$bin/$t"; done
  printf '%s\n' "$bin"
}

@test "refuses without flock, pointing at install or the single-worktree bypass" {
  bin=$(nobin_path nobin-refuse)
  cd "$primary"
  run env PATH="$bin" "$(command -v bash)" scripts/with-supabase-lock.sh true
  [ "$status" -eq 1 ]
  [[ "$output" == *"flock"* ]]
  [[ "$output" == *"ALLOW_UNSERIALIZED_SUPABASE=1"* ]]
  [[ "$output" == *"single worktree"* ]]
}

@test "runs unserialized without flock when ALLOW_UNSERIALIZED_SUPABASE=1" {
  bin=$(nobin_path nobin-bypass)
  cd "$primary"
  run env PATH="$bin" ALLOW_UNSERIALIZED_SUPABASE=1 "$(command -v bash)" scripts/with-supabase-lock.sh cat /dev/null
  [ "$status" -eq 0 ]
  [[ "$output" == *"UNSERIALIZED"* ]]
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
