begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('55555555-5555-5555-5555-555555555555', 'erin@example.com', '{"full_name": "Erin"}'::jsonb),
  ('66666666-6666-6666-6666-666666666666', 'frank@example.com', '{"full_name": "Frank"}'::jsonb);

select plan(5);

select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.live_kitchens'::regclass),
  'live_kitchens is security invoker, so kitchens RLS applies through it'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text,
  true
);
insert into public.kitchens (owner_id, name)
values ('55555555-5555-5555-5555-555555555555', 'Cabin');

select is((select count(*) from public.live_kitchens), 2::bigint, 'Erin sees both her live kitchens');

select public.soft_delete_kitchen((select id from public.kitchens where name = 'Cabin'));
select is(
  (select count(*) from public.live_kitchens where name = 'Cabin'),
  0::bigint,
  'A trashed kitchen drops out of live_kitchens'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-6666-6666-6666-666666666666', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.live_kitchens where owner_id = '55555555-5555-5555-5555-555555555555'),
  0::bigint,
  'Frank sees none of Erin''s kitchens'
);

set local role anon;
select throws_ok($$select * from public.live_kitchens$$, '42501', null, 'anon cannot select');

select * from finish();
rollback;
