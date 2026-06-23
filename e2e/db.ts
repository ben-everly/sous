import { execFileSync } from 'node:child_process'

// Local-only guard mirrors admin-client.ts: E2E SQL must never reach a real database.
const DB_URL =
  process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

function runSql(sql: string): string {
  const { hostname } = new URL(DB_URL)
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(`Refusing to run E2E SQL against a non-local database: ${hostname}`)
  }
  return execFileSync('psql', [DB_URL, '-tAc', sql], { encoding: 'utf8' }).trim()
}

// These values are interpolated into SQL string literals below; escape single quotes so a
// stray quote in an email can't break (or inject into) the query.
const lit = (value: string) => value.replace(/'/g, "''")

// Turn a freshly admin-created user into a Google-only account — no password, only a
// google identity — so it stands in for someone who has only ever signed in with Google.
// (The admin API can't synthesize an OAuth identity, so we shape it directly.)
export function makeGoogleOnly(userId: string, email: string): void {
  const id = lit(userId)
  const mail = lit(email)
  runSql(
    `delete from auth.identities where user_id = '${id}';
     insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ('g-${id}', '${id}', '{"sub":"g-${id}","email":"${mail}","email_verified":true}'::jsonb, 'google', now(), now(), now());
     update auth.users set encrypted_password = null where id = '${id}';`,
  )
}

export function identityProviders(userId: string): string[] {
  const out = runSql(
    `select coalesce(string_agg(provider, ',' order by provider), '') from auth.identities where user_id = '${lit(userId)}'`,
  )
  return out ? out.split(',') : []
}
