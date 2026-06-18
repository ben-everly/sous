#!/usr/bin/env bash
# Mint the local JWT signing key if absent, idempotently. A worktree symlinks the
# primary's key, so it's present there too; a linked worktree that somehow lacks it is
# steered to worktree:init rather than minting a divergent key that invalidates sessions.
# Minting is serialized under the shared lock — two checkouts racing the existence check
# would otherwise both append a key to the one shared file.
set -euo pipefail
dir=$(dirname "$0")

# Key present — nothing to mint. The re-exec below replays this script under the lock, so
# this same check is also the double-checked re-check on the second pass: a racing run that
# minted the key while we waited for the lock is caught here. Don't add a separate re-check.
if [ -f supabase/signing_keys.json ]; then
  exit 0
fi

# Self-acquire the lock for the mint; with-supabase-lock.sh sets WITH_SUPABASE_LOCK, so this
# re-execs through it exactly once (db:start, already locked, falls straight through).
if [ -z "${WITH_SUPABASE_LOCK:-}" ]; then
  exec bash "$dir/with-supabase-lock.sh" bash "$0" "$@"
fi

bash "$dir/guard-shared-supabase.sh" db:keys
echo '[]' >supabase/signing_keys.json
supabase gen signing-key --algorithm ES256 --append
