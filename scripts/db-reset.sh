#!/usr/bin/env bash
# Reset the shared local Supabase database. Guard before locking (see db-stop.sh).
set -euo pipefail
dir=$(dirname "$0")

bash "$dir/guard-shared-supabase.sh" db:reset
exec bash "$dir/with-supabase-lock.sh" supabase db reset --local
