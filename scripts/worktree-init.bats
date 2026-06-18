#!/usr/bin/env bats
# Behavioral tests for worktree-init.sh's link logic, the most-churned of the worktree scripts.
# Runs against a throwaway git repo — never the real checkout — so it can't read or touch the
# developer's actual .env / signing key.

setup() {
  scripts="$BATS_TEST_DIRNAME"
  tmp=$(mktemp -d)
  primary="$tmp/primary"
  mkdir -p "$primary/scripts" "$primary/supabase"
  cp "$scripts/worktree.sh" "$scripts/worktree-init.sh" "$primary/scripts/"
  printf 'project_id = "test"\n' >"$primary/supabase/config.toml"
  git -C "$primary" init -q
  git -C "$primary" add -A
  git -C "$primary" -c user.email=t@example.com -c user.name=test commit -q -m init
  # The shared dev files are untracked (like the real repo's gitignored ones) and created
  # after the commit, so the worktree checkout doesn't already contain them.
  printf 'ENV=primary\n' >"$primary/.env"
  printf '[\n  { "kid": "test" }\n]\n' >"$primary/supabase/signing_keys.json"
  wt="$tmp/wt"
  git -C "$primary" worktree add -q --detach "$wt" HEAD
}

teardown() {
  git -C "$primary" worktree remove --force "$wt" 2>/dev/null || true
  rm -rf "$tmp"
}

@test "links a shared dev file from the primary when the worktree lacks it" {
  cd "$wt"
  run bash scripts/worktree-init.sh
  [ "$status" -eq 0 ]
  [ -L .env ]
  [ "$(cat .env)" = "ENV=primary" ]
  [ -L supabase/signing_keys.json ]
}

@test "relinks a stale symlink left by a relocated primary" {
  ln -s /nonexistent/old-primary/.env "$wt/.env"
  cd "$wt"
  run bash scripts/worktree-init.sh
  [ "$status" -eq 0 ]
  [ -L .env ]
  [ "$(readlink .env)" = "$primary/.env" ]
  [ "$(cat .env)" = "ENV=primary" ]
}

@test "warns but never overwrites a real file already in the worktree" {
  printf 'ENV=local\n' >"$wt/.env"
  cd "$wt"
  run bash scripts/worktree-init.sh
  [ ! -L .env ]
  [ "$(cat .env)" = "ENV=local" ]
  [[ "$output" == *"WARNING"* ]]
}

@test "warns when the primary has no signing key to link" {
  rm -f "$primary/supabase/signing_keys.json"
  cd "$wt"
  run bash scripts/worktree-init.sh
  [[ "$output" == *"signing_keys.json"* ]]
  [ ! -e supabase/signing_keys.json ]
}

@test "warns instead of linking an empty-array signing key stub" {
  printf '[]\n' >"$primary/supabase/signing_keys.json"
  cd "$wt"
  run bash scripts/worktree-init.sh
  [[ "$output" == *"signing_keys.json"* ]]
  [ ! -L supabase/signing_keys.json ]
}
