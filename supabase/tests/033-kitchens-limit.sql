begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('55555555-5555-5555-5555-555555555555', 'erin@example.com', '{"full_name": "Erin"}'::jsonb);

select plan(7);

select is(
  (select count(*) from public.kitchens where owner_id = '55555555-5555-5555-5555-555555555555'),
  1::bigint,
  'signup still creates the first kitchen'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$insert into public.kitchens (name) select 'K' || i from generate_series(1, 9) i$$,
  'a user can create kitchens up to 10 total'
);
select throws_ok(
  $$insert into public.kitchens (name) values ('K10')$$,
  'SC001',
  'a user owns at most 10 kitchens',
  'the 11th kitchen fails with SC001'
);

select count(public.soft_delete_kitchen(id)) from public.kitchens where name in ('K1', 'K2', 'K3');
select throws_ok(
  $$insert into public.kitchens (name) values ('K10')$$,
  'SC001',
  'a user owns at most 10 kitchens',
  'trashed kitchens still count toward the cap'
);

select lives_ok(
  $$select public.restore_kitchen(id) from public.kitchens where name = 'K1'$$,
  'restoring a trashed kitchen at the cap succeeds'
);

select lives_ok(
  $$select public.purge_kitchen(id) from public.kitchens where name = 'K2'$$,
  'a trashed kitchen can be purged'
);
select lives_ok(
  $$insert into public.kitchens (name) values ('K10')$$,
  'purging frees a slot for a new kitchen'
);

select * from finish();
rollback;
