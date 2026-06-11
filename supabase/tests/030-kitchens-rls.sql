-- Locks the kitchens RLS + invariant contract.
begin;

-- Seed two users; on_auth_user_created bootstraps one nameless kitchen for each.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob"}'::jsonb);

select plan(14);

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

-- updated_at bumps on update. Seed a stale row directly; the BEFORE UPDATE trigger only fires on UPDATE.
insert into public.kitchens (owner_id, name, updated_at)
values ('11111111-1111-1111-1111-111111111111', 'Stale', '2000-01-01T00:00:00Z');
update public.kitchens set name = 'Fresh' where name = 'Stale';
select ok(
  (select updated_at from public.kitchens where name = 'Fresh') > '2000-01-01T00:00:00Z'::timestamptz,
  'updated_at is bumped on update'
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

reset role;
select * from finish();
rollback;
