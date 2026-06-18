#!/usr/bin/env bash
# Start the shared local Supabase stack, minting the signing key first if needed.
# Self-acquire the shared lock so keys-then-start hold it as one unit; with-supabase-lock.sh
# sets WITH_SUPABASE_LOCK once it holds the lock, so this re-execs through it exactly once.
set -euo pipefail
dir=$(dirname "$0")

if [ -z "${WITH_SUPABASE_LOCK:-}" ]; then
  exec bash "$dir/with-supabase-lock.sh" bash "$0" "$@"
fi

bash "$dir/db-keys.sh"
exec supabase start
