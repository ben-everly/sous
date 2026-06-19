-- Soft delete: deleted_at flags a trashed kitchen. Live-vs-trash is a query filter, not RLS —
-- the existing owner-only policies still authorize every operation here.
alter table public.kitchens add column deleted_at timestamptz;

-- A trashed nameless kitchen no longer occupies the "one unnamed per owner" slot, so a fresh
-- nameless bootstrap could otherwise be blocked by a row the user can't even see in the live list.
drop index kitchens_one_unnamed_per_owner;
create unique index kitchens_one_unnamed_per_owner
  on public.kitchens (owner_id) where name is null and deleted_at is null;

-- security invoker (the default) → RLS adds owner_id = auth.uid(); no ownership check to duplicate.
-- search_path = '' (schema-qualified refs) clears the db:advisors function-search-path lint.
-- The deleted_at guard makes each a no-op on a wrong-state row; returning no row = failure to the client.
create function public.soft_delete_kitchen(kitchen_id uuid)
returns public.kitchens
language sql security invoker set search_path = '' as $$
  update public.kitchens
     set deleted_at = now()
   where id = kitchen_id and deleted_at is null
  returning *;
$$;

create function public.restore_kitchen(kitchen_id uuid)
returns public.kitchens
language sql security invoker set search_path = '' as $$
  update public.kitchens
     set deleted_at = null
   where id = kitchen_id and deleted_at is not null
  returning *;
$$;
