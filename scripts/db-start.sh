#!/usr/bin/env bash
set -euo pipefail
dir=$(dirname "$0")

# Self-lock (unlike the guard-then-lock siblings): keys-then-start must hold the
# lock as one unit, not as two separate acquisitions.
if [ -z "${WITH_SUPABASE_LOCK:-}" ]; then
  exec bash "$dir/with-supabase-lock.sh" bash "$0" "$@"
fi

bash "$dir/db-keys.sh"
exec supabase start
