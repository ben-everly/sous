-- Runs before all other test files (alphabetical order).
begin;

create extension if not exists pgtap with schema extensions;

select plan(2);
select has_extension('pgtap', 'pgTAP extension is installed');
select hasnt_extension('pg_graphql', 'pg_graphql extension is not installed');
select * from finish();

rollback;
