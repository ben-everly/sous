-- Locks the handle_new_user bootstrap contract: named signup, cascade delete,
-- lenient/absent metadata, and input sanitization (cleansed, never rejected).
begin;

select plan(11);

-- 1. A normal signup with full_name creates a named profile.
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

-- 2. Deleting the user cascades to the profile.
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'Deleting the user cascades to the profile'
);

-- 3. Empty metadata still succeeds as a nameless profile.
insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'empty@example.com', '{}'::jsonb);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  null,
  'Empty metadata yields a nameless profile (no error)'
);

-- 4. picture-only metadata: nameless, avatar falls back to the picture key.
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

-- 5. Control chars + over-length name are stored cleansed, not rejected.
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

-- 6. A non-https avatar from the provider is dropped to null (not rejected).
insert into auth.users (id, email, raw_user_meta_data)
values ('aaaaaaaa-0000-0000-0000-000000000005', 'http@example.com',
  '{"full_name": "Ada", "avatar_url": "http://insecure.example/a.png"}'::jsonb);
select is(
  (select avatar_url from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000005'),
  null,
  'Non-https avatar_url is dropped to null, signup still succeeds'
);

-- 7. The column CHECK rejects a direct update to a non-https avatar.
select throws_ok(
  $$update public.profiles set avatar_url = 'http://insecure.example/a.png'
     where id = 'aaaaaaaa-0000-0000-0000-000000000005'$$,
  '23514',
  null,
  'Column CHECK rejects a non-https avatar_url on update'
);

select * from finish();
rollback;
