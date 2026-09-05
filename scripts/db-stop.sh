#!/usr/bin/env bash
set -euo pipefail
dir=$(dirname "$0")

# Guard first: fail fast instead of waiting on the lock only to be refused.
bash "$dir/guard-shared-supabase.sh" db:stop
exec bash "$dir/with-supabase-lock.sh" supabase stop
