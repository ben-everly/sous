alter table public.kitchens add column deleted_at timestamptz;

drop index kitchens_one_unnamed_per_owner;
create unique index kitchens_one_unnamed_per_owner
  on public.kitchens (owner_id) where name is null and deleted_at is null;

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

create function public.purge_kitchen(kitchen_id uuid)
returns public.kitchens
language sql security invoker set search_path = '' as $$
  delete from public.kitchens
   where id = kitchen_id and deleted_at is not null
  returning *;
$$;

revoke execute on function public.soft_delete_kitchen(uuid), public.restore_kitchen(uuid), public.purge_kitchen(uuid) from public;
grant execute on function public.soft_delete_kitchen(uuid), public.restore_kitchen(uuid), public.purge_kitchen(uuid) to authenticated;
