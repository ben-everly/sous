-- Locks the kitchens RLS + invariant contract.
begin;

-- Seed two users; on_auth_user_created bootstraps one nameless kitchen for each.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob"}'::jsonb);

select plan(22);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.kitchens'::regclass),
  'RLS is enabled on public.kitchens'
);

-- Act as Alice.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.kitchens),
  1::bigint,
  'Alice sees exactly one kitchen (her bootstrapped one)'
);
select is(
  (select name from public.kitchens),
  null,
  'The bootstrapped kitchen is nameless'
);

insert into public.kitchens (owner_id, name)
values ('11111111-1111-1111-1111-111111111111', 'Beach House');
select is(
  (select count(*) from public.kitchens),
  2::bigint,
  'Alice can insert a named kitchen for herself'
);

select throws_ok(
  $$insert into public.kitchens (owner_id, name) values ('22222222-2222-2222-2222-222222222222', 'Steal')$$,
  '42501',
  null,
  'Alice cannot insert a kitchen owned by Bob'
);

-- USING matches her own rows, so the with check (not the cross-user block) is what fires here.
select throws_ok(
  $$update public.kitchens set owner_id = '22222222-2222-2222-2222-222222222222' where owner_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'Alice cannot transfer her kitchen to Bob'
);

-- She already has the bootstrapped nameless kitchen; a second is barred by the partial unique index.
select throws_ok(
  $$insert into public.kitchens (owner_id) values ('11111111-1111-1111-1111-111111111111')$$,
  '23505',
  null,
  'Alice cannot create a second unnamed kitchen'
);

select throws_ok(
  $$insert into public.kitchens (owner_id, name) values ('11111111-1111-1111-1111-111111111111', '   ')$$,
  '23514',
  null,
  'A whitespace-only name is rejected by the CHECK'
);

select throws_ok(
  $$insert into public.kitchens (owner_id, name) values ('11111111-1111-1111-1111-111111111111', repeat('x', 201))$$,
  '23514',
  null,
  'A name longer than 200 chars is rejected by the CHECK'
);

-- Once the bootstrapped kitchen is named, a fresh nameless one is allowed.
update public.kitchens set name = 'Home' where name is null;
insert into public.kitchens (owner_id) values ('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*) from public.kitchens where name is null),
  1::bigint,
  'A nameless kitchen is allowed once the first is named'
);

-- ...and again after deleting it (the other branch of the rename-or-delete rule).
delete from public.kitchens
  where owner_id = '11111111-1111-1111-1111-111111111111' and name is null;
insert into public.kitchens (owner_id) values ('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*) from public.kitchens
     where owner_id = '11111111-1111-1111-1111-111111111111' and name is null),
  1::bigint,
  'A nameless kitchen is allowed again after deleting the previous one'
);

-- Timestamps are server-maintained: client-supplied created_at/updated_at are ignored on
-- insert, and created_at is frozen on update. now() is the (constant) transaction time here,
-- so a forged past value is detectable by comparing the stored value against now().
insert into public.kitchens (owner_id, name, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', 'Stamped', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z');
select is(
  (select created_at from public.kitchens where name = 'Stamped'),
  now(),
  'created_at supplied on insert is overwritten with now()'
);
select is(
  (select updated_at from public.kitchens where name = 'Stamped'),
  now(),
  'updated_at supplied on insert is overwritten with now()'
);
update public.kitchens set name = 'Stamped2', created_at = '1999-01-01T00:00:00Z'
  where name = 'Stamped';
select is(
  (select created_at from public.kitchens where name = 'Stamped2'),
  now(),
  'created_at is frozen on update; a client-supplied value is ignored'
);

-- Cannot touch Bob's kitchen: update + delete silently affect 0 rows (no error).
update public.kitchens set name = 'Hacked'
  where owner_id = '22222222-2222-2222-2222-222222222222';
delete from public.kitchens where owner_id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select count(*) from public.kitchens where owner_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'Alice cannot delete Bob''s kitchen'
);
select is(
  (select name from public.kitchens where owner_id = '22222222-2222-2222-2222-222222222222'),
  null,
  'Alice cannot update Bob''s kitchen'
);

-- Alice can delete her own kitchen.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);
delete from public.kitchens where name = 'Beach House';
select is(
  (select count(*) from public.kitchens where name = 'Beach House'),
  0::bigint,
  'Alice can delete her own kitchen'
);

-- Bob sees only his own kitchen.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.kitchens),
  1::bigint,
  'Bob sees exactly one kitchen (his own), never Alice''s'
);

-- anon's table grants are revoked, so every operation is denied at the grant layer (42501) and
-- never even reaches RLS. Holds the never-anon contract even if a future policy adds `to anon`.
set local role anon;
select throws_ok(
  $$select count(*) from public.kitchens$$,
  '42501',
  null,
  'anon cannot read kitchens'
);
select throws_ok(
  $$insert into public.kitchens (owner_id, name) values ('22222222-2222-2222-2222-222222222222', 'Anon')$$,
  '42501',
  null,
  'anon cannot insert a kitchen'
);
select throws_ok(
  $$delete from public.kitchens$$,
  '42501',
  null,
  'anon cannot delete kitchens'
);
reset role;
select is(
  (select count(*) from public.kitchens where owner_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'Bob''s kitchen is untouched by the anon attempts'
);

reset role;
select * from finish();
rollback;
