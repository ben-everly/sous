-- Runs before all other test files (alphabetical order).
-- Enables pgTAP and asserts the extension is available.
begin;

create extension if not exists pgtap with schema extensions;

select plan(1);
select has_extension('pgtap', 'pgTAP extension is installed');
select * from finish();

rollback;
