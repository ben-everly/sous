create function public.search_recipes(query text)
returns table (id uuid, slug text, name text)
language sql stable security invoker set search_path = ''
as $$
  with words as (
    select distinct lower(replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_')) as pat
    from regexp_split_to_table(left(btrim(query), 200), '\s+') as w
    where w <> ''
  )
  select r.id, r.slug, r.name
  from public.recipes r
  where exists (select 1 from words)
    and not exists (
      select 1 from words
      where r.name not ilike '%' || words.pat || '%'
        and coalesce(r.description, '') not ilike '%' || words.pat || '%'
    )
  order by
    (select count(*) from words where r.name not ilike '%' || words.pat || '%'),
    r.name,
    r.id
  limit 20
$$;

revoke execute on function public.search_recipes(text) from public, anon;
grant execute on function public.search_recipes(text) to authenticated;
