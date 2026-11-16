-- Rol de solo lectura ("viewer"): puede mirar todo, pero no modificar datos.
-- Ejecutar después de schema.sql. Reemplaza save_state y restore_history por versiones que exigen permiso de escritura.
alter table public.allowed_users drop constraint if exists allowed_users_role_check;
alter table public.allowed_users add constraint allowed_users_role_check check (role in ('admin', 'user', 'viewer'));

create or replace function public.can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where user_id = auth.uid() and role in ('admin', 'user'));
$$;
revoke all on function public.can_write() from public, anon, authenticated;
grant execute on function public.can_write() to authenticated;

create or replace function public.save_state(p_data jsonb, p_expected_version integer) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer; last_snap timestamptz;
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
  if not public.can_write() then raise exception 'READ_ONLY'; end if;
  if jsonb_typeof(p_data) <> 'object'
     or jsonb_typeof(p_data->'items') <> 'array'
     or jsonb_typeof(p_data->'sales') <> 'array'
     or jsonb_typeof(p_data->'moves') <> 'array'
     or jsonb_typeof(p_data->'expenses') <> 'array'
     or jsonb_typeof(p_data->'cash') <> 'object' then
    raise exception 'INVALID_DATA';
  end if;
  if pg_column_size(p_data) > 15000000 then raise exception 'TOO_LARGE'; end if;

  if p_expected_version = 0 then
    insert into public.app_state (id, data, version, updated_by) values (1, p_data, 1, auth.uid())
    on conflict (id) do nothing returning version into v;
  else
    update public.app_state set data = p_data, version = p_expected_version + 1, updated_by = auth.uid(), updated_at = now()
    where id = 1 and version = p_expected_version returning version into v;
  end if;
  if v is null then raise exception 'CONFLICT'; end if;

  select max(created_at) into last_snap from public.app_state_history;
  if last_snap is null or last_snap < now() - interval '15 minutes' then
    insert into public.app_state_history (version, data, created_by) values (v, p_data, auth.uid());
  end if;
  return v;
end $$;

create or replace function public.restore_history(p_id bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare snap jsonb; cur record; v integer;
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
  if not public.can_write() then raise exception 'READ_ONLY'; end if;
  select data into snap from public.app_state_history where id = p_id;
  if snap is null then raise exception 'NOT_FOUND'; end if;
  select data, version into cur from public.app_state where id = 1 for update;
  if found then
    insert into public.app_state_history (version, data, created_by) values (cur.version, cur.data, auth.uid());
    update public.app_state set data = snap, version = cur.version + 1, updated_by = auth.uid(), updated_at = now()
      where id = 1 returning version into v;
  else
    insert into public.app_state (id, data, version, updated_by) values (1, snap, 1, auth.uid()) returning version into v;
  end if;
  return v;
end $$;
revoke all on function public.save_state(jsonb, integer), public.restore_history(bigint) from public, anon, authenticated;
grant execute on function public.save_state(jsonb, integer), public.restore_history(bigint) to authenticated;

-- El primer uso solo se ofrece mientras no haya ningún administrador (pueden existir usuarios de solo lectura).
create or replace function public.needs_setup() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.allowed_users where role = 'admin');
$$;
