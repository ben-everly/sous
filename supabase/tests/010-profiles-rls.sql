-- Locks the profiles RLS contract.
begin;

-- Seed two users; the on_auth_user_created trigger bootstraps their profiles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob"}'::jsonb);

select plan(7);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on public.profiles'
);

-- Act as Alice.
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

-- Attempt to update Bob's row: RLS silently affects 0 rows (no error).
update public.profiles set display_name = 'Hacked'
  where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Bob',
  'Alice cannot update Bob''s profile'
);

-- Act as Bob.
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
