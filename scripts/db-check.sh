#!/usr/bin/env bash
set -euo pipefail
dir=$(dirname "$0")
migrations="$dir/../supabase/migrations"

# Self-lock so the snapshot below can't see a concurrent db:sync's migration as drift.
if [ -z "${WITH_SUPABASE_LOCK:-}" ]; then
  exec bash "$dir/with-supabase-lock.sh" bash "$0" "$@"
fi

# sync has no dry run: on drift it writes a migration, so diff the directory and remove it.
before=$(ls "$migrations")
new_migrations() { comm -13 <(echo "$before") <(ls "$migrations"); }
trap 'new_migrations | (cd "$migrations" && xargs -r rm -f --)' EXIT
supabase db schema declarative sync --no-apply --strict-coverage
[ -z "$(new_migrations)" ] && exit 0

echo "error: supabase/schemas and supabase/migrations disagree; run 'npm run db:sync -- -f <name>'." >&2
exit 1
