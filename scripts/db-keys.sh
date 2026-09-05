#!/usr/bin/env bash
set -euo pipefail
dir=$(dirname "$0")
# shellcheck source=scripts/worktree.sh
. "$dir/worktree.sh"

if has_signing_key; then
  exit 0
fi

# Not locked yet: re-exec through the shared lock, which replays this whole script and
# re-runs the check above — the double-checked recheck a mint race needs.
if [ -z "${WITH_SUPABASE_LOCK:-}" ]; then
  exec bash "$dir/with-supabase-lock.sh" bash "$0" "$@"
fi

bash "$dir/guard-shared-supabase.sh" db:keys
echo '[]' >supabase/signing_keys.json
supabase gen signing-key --algorithm ES256 --append
