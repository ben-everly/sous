begin;

-- Seed two users; the on_auth_user_created trigger bootstraps their profiles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob"}'::jsonb);

select plan(10);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on public.profiles'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'Alice sees exactly one profile (her own)'
);
select is(
  (select id from public.profiles),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'The visible profile is Alice''s'
);

update public.profiles set display_name = 'Alice Updated'
  where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice Updated',
  'Alice can update her own profile'
);

-- created_at is server-maintained: a client-supplied value on update is frozen to now()
-- (the constant transaction time here), so the forged past value never lands.
update public.profiles set created_at = '2000-01-01T00:00:00Z'
  where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select created_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  now(),
  'created_at on a profile is frozen on update; a client-supplied value is ignored'
);

-- No INSERT policy: denied even for her own id (RLS fires before the PK conflict would).
select throws_ok(
  $$insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111')$$,
  '42501',
  null,
  'Alice cannot insert a profile, even for her own id'
);

-- No DELETE policy: silently affects 0 rows.
delete from public.profiles where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'Alice cannot delete her own profile'
);

-- Attempt to update Bob's row: RLS silently affects 0 rows (no error).
update public.profiles set display_name = 'Hacked'
  where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Bob',
  'Alice cannot update Bob''s profile'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'Bob cannot see Alice''s profile'
);
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'Bob sees exactly one profile (his own)'
);

reset role;
select * from finish();
rollback;
