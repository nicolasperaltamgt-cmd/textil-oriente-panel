-- Textil Oriente: base de datos del panel de stock y caja (Supabase / Postgres).
-- Todo el acceso pasa por funciones; las tablas no tienen políticas, así que
-- nadie puede leerlas ni escribirlas directamente desde el navegador.

create table if not exists public.allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- Código de instalación (solo guarda el hash; se borra al crear el primer administrador).
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

create table if not exists public.app_state (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  version integer not null,
  data jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists app_state_history_created_at_idx on public.app_state_history (created_at desc);

alter table public.allowed_users enable row level security;
alter table public.app_state enable row level security;
alter table public.app_state_history enable row level security;
revoke all on public.allowed_users, public.app_state, public.app_state_history from anon, authenticated;

-- ¿El usuario que llama tiene acceso al panel?
create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where user_id = auth.uid() and role = 'admin');
$$;

-- Pública: solo dice si todavía no hay ningún administrador (primer uso).
create or replace function public.needs_setup() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.allowed_users);
$$;

create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('role', role, 'display_name', display_name)
  from public.allowed_users where user_id = auth.uid();
$$;

create or replace function public.get_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
  select data, version into r from public.app_state where id = 1;
  if not found then
    return jsonb_build_object('data', null, 'version', 0);
  end if;
  return jsonb_build_object('data', r.data, 'version', r.version);
end $$;

create or replace function public.save_state(p_data jsonb, p_expected_version integer) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer; last_snap timestamptz;
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
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

create or replace function public.list_history() returns table (id bigint, version integer, created_at timestamptz, telas integer, ventas integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
  return query
    select h.id, h.version, h.created_at, jsonb_array_length(h.data->'items'), jsonb_array_length(h.data->'sales')
    from public.app_state_history h order by h.created_at desc limit 80;
end $$;

create or replace function public.restore_history(p_id bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare snap jsonb; cur record; v integer;
begin
  if not public.is_allowed() then raise exception 'NO_ACCESS'; end if;
  select data into snap from public.app_state_history where id = p_id;
  if snap is null then raise exception 'NOT_FOUND'; end if;
  select data, version into cur from public.app_state where id = 1 for update;
  if found then
    -- Antes de volver atrás se guarda lo actual: nada se pierde.
    insert into public.app_state_history (version, data, created_by) values (cur.version, cur.data, auth.uid());
    update public.app_state set data = snap, version = cur.version + 1, updated_by = auth.uid(), updated_at = now()
      where id = 1 returning version into v;
  else
    insert into public.app_state (id, data, version, updated_by) values (1, snap, 1, auth.uid()) returning version into v;
  end if;
  return v;
end $$;

revoke all on function public.is_allowed(), public.is_admin(), public.needs_setup(), public.my_profile(),
  public.get_state(), public.save_state(jsonb, integer), public.list_history(), public.restore_history(bigint) from public, anon, authenticated;
grant execute on function public.needs_setup() to anon, authenticated;
grant execute on function public.is_allowed(), public.is_admin(), public.my_profile(),
  public.get_state(), public.save_state(jsonb, integer), public.list_history(), public.restore_history(bigint) to authenticated;
