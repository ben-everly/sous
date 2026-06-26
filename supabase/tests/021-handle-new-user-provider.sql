-- An email-provider signup with no name is expected (not Google-schema drift):
-- it must still create a nameless profile and bootstrap a kitchen.
-- (The drift raise-log suppression is logging-only and not assertable in pgTAP.)
begin;

select plan(2);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'password@example.com',
  '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb);

select is(
  (select display_name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  null,
  'email-provider signup with no name yields a nameless profile'
);
select is(
  (select count(*) from public.kitchens where owner_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1::bigint,
  'email-provider signup still bootstraps exactly one kitchen'
);

select * from finish();
rollback;
