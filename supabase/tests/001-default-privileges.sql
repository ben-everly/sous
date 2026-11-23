-- anon reaches a new public object only through an explicit grant; authenticated gets CRUD only.
begin;
select plan(6);

create table public.default_privileges_probe ();
create sequence public.default_privileges_probe_seq;
create function public.default_privileges_probe() returns int language sql as 'select 1';

select table_privs_are(
  'public', 'default_privileges_probe', 'anon',
  array[]::text[],
  'new tables grant anon nothing'
);
select ok(
  not has_table_privilege('anon', 'public.default_privileges_probe', 'maintain'),
  'new tables do not grant anon MAINTAIN'
);
select ok(
  not has_sequence_privilege('anon', 'public.default_privileges_probe_seq', 'usage, select, update'),
  'new sequences are not granted to anon'
);
select ok(
  not has_function_privilege('anon', 'public.default_privileges_probe()', 'execute'),
  'new functions are not granted to anon'
);
select table_privs_are(
  'public', 'default_privileges_probe', 'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'new tables grant authenticated CRUD only'
);
select ok(
  not has_table_privilege('authenticated', 'public.default_privileges_probe', 'maintain'),
  'new tables do not grant authenticated MAINTAIN'
);

select * from finish();
rollback;
