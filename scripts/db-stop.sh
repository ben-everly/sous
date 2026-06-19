#!/usr/bin/env bash
# Stop the shared local Supabase stack. Guard before locking so a linked worktree is
# refused immediately rather than waiting on the lock only to be turned away.
set -euo pipefail
dir=$(dirname "$0")

bash "$dir/guard-shared-supabase.sh" db:stop
exec bash "$dir/with-supabase-lock.sh" supabase stop
