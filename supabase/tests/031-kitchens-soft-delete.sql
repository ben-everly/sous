-- Locks the soft-delete RPC contract: stamp/clear deleted_at, RLS via security invoker,
-- no-op guards on wrong-state rows, and the partial unique index ignoring trashed rows.
begin;

-- on_auth_user_created bootstraps one nameless kitchen per user.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', '{"full_name": "Carol"}'::jsonb),
  ('44444444-4444-4444-4444-444444444444', 'dave@example.com', '{"full_name": "Dave"}'::jsonb);

select plan(11);

-- Act as Dave first: create a kitchen with a known id so Carol can later try (and fail) to trash it.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text,
  true
);
insert into public.kitchens (id, owner_id, name)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Dave Kitchen');

-- Act as Carol.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text,
  true
);

-- Name the bootstrapped kitchen so the unnamed-slot tests later start from a clean slate.
update public.kitchens set name = 'Home' where name is null;
insert into public.kitchens (owner_id, name)
values ('33333333-3333-3333-3333-333333333333', 'Beach House');

-- soft_delete_kitchen stamps deleted_at and returns the row.
select isnt(
  (select deleted_at from public.soft_delete_kitchen(
     (select id from public.kitchens where name = 'Beach House'))),
  null,
  'soft_delete_kitchen stamps deleted_at and returns the row'
);

-- The trashed kitchen is hidden from the live filter...
select is(
  (select count(*) from public.kitchens where name = 'Beach House' and deleted_at is null),
  0::bigint,
  'a soft-deleted kitchen is excluded by the deleted_at is null filter'
);
-- ...but still owner-visible (RLS unchanged).
select is(
  (select count(*) from public.kitchens where name = 'Beach House'),
  1::bigint,
  'a soft-deleted kitchen is still owner-visible (RLS returns live and trashed rows)'
);

-- No-op on an already-trashed row: the guard matches nothing, so the function returns null.
-- (A non-SETOF composite function used in FROM yields one all-null row, so test a column, not count(*).)
select is(
  (select id from public.soft_delete_kitchen(
     (select id from public.kitchens where name = 'Beach House'))),
  null,
  'soft_delete_kitchen is a no-op on an already-trashed kitchen'
);

-- restore_kitchen clears deleted_at.
select is(
  (select deleted_at from public.restore_kitchen(
     (select id from public.kitchens where name = 'Beach House'))),
  null,
  'restore_kitchen clears deleted_at'
);

-- No-op on a live row.
select is(
  (select id from public.restore_kitchen(
     (select id from public.kitchens where name = 'Beach House'))),
  null,
  'restore_kitchen is a no-op on a live kitchen'
);

-- Carol cannot trash Dave's kitchen: RLS (via security invoker) filters the update to 0 rows → null.
select is(
  (select id from public.soft_delete_kitchen('dddddddd-dddd-dddd-dddd-dddddddddddd')),
  null,
  'soft_delete_kitchen cannot touch another owner''s kitchen (RLS via invoker)'
);

-- Confirm Dave's kitchen is genuinely untouched, checked as Dave.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text,
  true
);
select is(
  (select deleted_at from public.kitchens where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  null,
  'the other owner''s kitchen is still live after the blocked soft delete'
);

-- Back to Carol for the partial-index tests.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text,
  true
);

-- One live nameless kitchen is allowed; a second is barred by the partial unique index.
insert into public.kitchens (owner_id) values ('33333333-3333-3333-3333-333333333333');
select throws_ok(
  $$insert into public.kitchens (owner_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '23505',
  null,
  'two live nameless kitchens are barred by the partial unique index'
);

-- Trashing the live nameless one frees the slot, so a fresh nameless kitchen is allowed.
select isnt(
  (select deleted_at from public.soft_delete_kitchen(
     (select id from public.kitchens where name is null and deleted_at is null))),
  null,
  'soft_delete_kitchen trashes the live nameless kitchen'
);
insert into public.kitchens (owner_id) values ('33333333-3333-3333-3333-333333333333');
select is(
  (select count(*) from public.kitchens where name is null and deleted_at is null),
  1::bigint,
  'a new nameless kitchen is allowed once the prior one is trashed (partial index ignores it)'
);

select * from finish();
rollback;
