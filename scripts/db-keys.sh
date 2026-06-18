#!/usr/bin/env bash
# Mint the local JWT signing key if absent, idempotently. A worktree symlinks the
# primary's key, so it's present there too; a linked worktree that somehow lacks it is
# steered to worktree:init rather than minting a divergent key that invalidates sessions.
set -euo pipefail
dir=$(dirname "$0")

if [ -f supabase/signing_keys.json ]; then
  exit 0
fi

bash "$dir/guard-shared-supabase.sh" db:keys
echo '[]' >supabase/signing_keys.json
supabase gen signing-key --algorithm ES256 --append
