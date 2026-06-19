-- Locks the handle_new_user bootstrap contract.
begin;

select plan(36);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'auth_hooks' and has_function_privilege('authenticated', p.oid, 'execute')),
  0::bigint,
  'no auth_hooks function is executable by authenticated'
);
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'auth_hooks' and has_function_privilege('anon', p.oid, 'execute')),
  0::bigint,
  'no auth_hooks function is executable by anon'
);

-- The pure sanitizers the trigger reuses, tested directly (jsonb in → text out).
select is(
  auth_hooks.sanitize_meta_name('{"full_name": "Grace Hopper"}'::jsonb),
  'Grace Hopper',
  'name: returns full_name'
);
select is(
  auth_hooks.sanitize_meta_name('{"name": "Ada"}'::jsonb),
  'Ada',
  'name: falls back to the name key'
);
select is(
  auth_hooks.sanitize_meta_name('{"full_name": "Grace", "name": "Ada"}'::jsonb),
  'Grace',
  'name: full_name takes precedence over name'
);
select is(
  auth_hooks.sanitize_meta_name('{"full_name": "  Ada  "}'::jsonb),
  'Ada',
  'name: trims surrounding whitespace'
);
select is(
  auth_hooks.sanitize_meta_name('{"full_name": "   "}'::jsonb),
  null,
  'name: whitespace-only collapses to null'
);
select is(
  auth_hooks.sanitize_meta_name('{}'::jsonb),
  null,
  'name: absent keys yield null'
);
select is(
  auth_hooks.sanitize_meta_name(jsonb_build_object('full_name', 'Bad' || chr(7) || 'Name')),
  'BadName',
  'name: strips control characters'
);
select is(
  char_length(auth_hooks.sanitize_meta_name(jsonb_build_object('full_name', repeat('x', 300)))),
  200,
  'name: caps length at 200'
);
select is(
  auth_hooks.sanitize_meta_avatar('{"avatar_url": "https://example.com/a.png"}'::jsonb),
  'https://example.com/a.png',
  'avatar: returns an https avatar_url'
);
select is(
  auth_hooks.sanitize_meta_avatar('{"picture": "https://example.com/p.png"}'::jsonb),
  'https://example.com/p.png',
  'avatar: falls back to the picture key'
);
select is(
  auth_hooks.sanitize_meta_avatar('{"avatar_url": "https://a.example", "picture": "https://p.example"}'::jsonb),
  'https://a.example',
  'avatar: avatar_url takes precedence over picture'
);
select is(
  auth_hooks.sanitize_meta_avatar('{"avatar_url": "http://insecure.example/a.png"}'::jsonb),
  null,
  'avatar: drops a non-https URL'
);
select is(
  auth_hooks.sanitize_meta_avatar('{}'::jsonb),
  null,
  'avatar: absent keys yield null'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'named@example.com',
  '{"full_name": "Grace Hopper", "avatar_url": "https://example.com/a.png"}'::jsonb);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Grace Hopper',
  'Trigger creates a profile with display_name from full_name'
);
select is(
  (select avatar_url from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'https://example.com/a.png',
  'Trigger copies avatar_url'
);
select is(
  (select count(*) from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint,
  'Trigger bootstraps exactly one kitchen for the new user'
);
select is(
  (select name from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'The bootstrapped kitchen is nameless'
);
-- Proves the security-invoker timestamp trigger fires on the security-definer bootstrap insert:
-- now() is the constant transaction time, so a stored value equal to it must be server-stamped.
select is(
  (select created_at from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  now(),
  'The bootstrapped kitchen has a server-set created_at'
);
select is(
  (select updated_at from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  now(),
  'The bootstrapped kitchen has a server-set updated_at'
);

delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'Deleting the user cascades to the profile'
);
select is(
  (select count(*) from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'Deleting the user cascades to the kitchen'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'empty@example.com', '{}'::jsonb);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  null,
  'Empty metadata yields a nameless profile (no error)'
);
select is(
  (select count(*) from public.kitchens where owner_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1::bigint,
  'Empty metadata still bootstraps a kitchen (fail-loud bootstrap preserved)'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'pic@example.com',
  '{"picture": "https://example.com/p.png"}'::jsonb);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  null,
  'picture-only metadata yields a nameless profile'
);
select is(
  (select avatar_url from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'https://example.com/p.png',
  'avatar_url falls back to the picture key'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000004', 'dirty@example.com',
  jsonb_build_object('full_name', 'Bad' || chr(7) || 'Name' || repeat('x', 300)));
select ok(
  (select display_name !~ '[[:cntrl:]]'
     from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  'Control characters are stripped from the display name'
);
select ok(
  (select char_length(display_name) <= 200
     from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  'Over-length display name is capped at 200 characters'
);
select ok(
  (select display_name is not null
     from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  'A dirty-but-nonempty name is stored cleansed, not rejected'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000005', 'http@example.com',
  '{"full_name": "Ada", "avatar_url": "http://insecure.example/a.png"}'::jsonb);
select is(
  (select avatar_url from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000005'),
  null,
  'Non-https avatar_url is dropped to null, signup still succeeds'
);

select throws_ok(
  $$update public.profiles set avatar_url = 'http://insecure.example/a.png'
     where id = 'aaaaaaaa-0000-0000-0000-000000000005'$$,
  '23514',
  null,
  'Column CHECK rejects a non-https avatar_url on update'
);

-- Fails loud by design: a failed profile insert must abort the whole signup,
-- never leaving an auth.users row without a profile. Force the insert to fail.
create function public._force_profile_failure() returns trigger language plpgsql as $$
begin raise exception 'forced profile failure'; end;
$$;
create trigger _force_profile_failure before insert on public.profiles
  for each row execute procedure public._force_profile_failure();

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
     values ('aaaaaaaa-0000-0000-0000-000000000006', 'fatal@example.com', '{}'::jsonb)$$,
  'P0001',
  'forced profile failure',
  'A failed profile insert aborts the signup (handle_new_user fails loud)'
);
select is(
  (select count(*) from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000006'),
  0::bigint,
  'No orphan auth.users row remains when the profile insert fails'
);

drop trigger _force_profile_failure on public.profiles;
drop function public._force_profile_failure();

-- Same fail-loud contract for the second bootstrap insert: a failed kitchen insert must
-- also abort the signup, never leaving a user without their bootstrapped kitchen.
create function public._force_kitchen_failure() returns trigger language plpgsql as $$
begin raise exception 'forced kitchen failure'; end;
$$;
create trigger _force_kitchen_failure before insert on public.kitchens
  for each row execute procedure public._force_kitchen_failure();

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
     values ('aaaaaaaa-0000-0000-0000-000000000007', 'nokitchen@example.com', '{}'::jsonb)$$,
  'P0001',
  'forced kitchen failure',
  'A failed kitchen insert aborts the signup (handle_new_user fails loud)'
);
select is(
  (select count(*) from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000007'),
  0::bigint,
  'No orphan auth.users row remains when the kitchen insert fails'
);

drop trigger _force_kitchen_failure on public.kitchens;
drop function public._force_kitchen_failure();

select * from finish();
rollback;
