-- Viruflix: instalación completa de Supabase para un proyecto NUEVO.
-- Ejecuta este archivo UNA vez en Supabase Dashboard > SQL Editor.
-- No lo ejecutes para reemplazar a ciegas una base de producción con datos:
-- haz primero un backup y revisa las políticas/RPC que ya tengas.

create extension if not exists pgcrypto;

-- Esquema base
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  user_id text not null,
  is_approved boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  show_adult_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(trim(username)) between 1 and 80),
  constraint profiles_user_id_length check (char_length(trim(user_id)) between 3 and 120)
);
create unique index if not exists profiles_user_id_uidx on public.profiles (user_id);
create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  content_type text not null check (content_type in ('movie', 'tv', 'anime')),
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  total_duration numeric,
  season_number integer,
  episode_number integer,
  last_watched_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists watch_history_user_content_type_uidx on public.watch_history (user_id, content_id, content_type);
create index if not exists watch_history_user_last_watched_idx on public.watch_history (user_id, last_watched_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists watch_history_set_updated_at on public.watch_history;
create trigger watch_history_set_updated_at before update on public.watch_history for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente tras un registro en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = pg_temp as $$
declare display_name text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1), 'Usuario');
  insert into public.profiles (id, username, user_id)
  values (new.id, left(display_name, 80), 'u_' || substr(replace(new.id::text, '-', ''), 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS: el usuario solo ve y modifica sus propios datos.
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.watch_history enable row level security;
drop policy if exists watch_history_select_own on public.watch_history;
create policy watch_history_select_own on public.watch_history for select to authenticated using (user_id = auth.uid());
drop policy if exists watch_history_insert_own on public.watch_history;
create policy watch_history_insert_own on public.watch_history for insert to authenticated with check (user_id = auth.uid());
drop policy if exists watch_history_update_own on public.watch_history;
create policy watch_history_update_own on public.watch_history for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists watch_history_delete_own on public.watch_history;
create policy watch_history_delete_own on public.watch_history for delete to authenticated using (user_id = auth.uid());
alter table public.watch_history replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication p join pg_publication_rel pr on p.oid = pr.prpubid join pg_class c on pr.prrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'watch_history') then
    alter publication supabase_realtime add table public.watch_history;
  end if;
end $$;

-- Login por username/user_id y RPC de administración.
create or replace function public.get_email_for_login(identifier text)
returns text language plpgsql stable security definer set search_path = pg_temp as $$
declare normalized text; resolved_email text; matches integer;
begin
  normalized := trim(identifier);
  if normalized is null or length(normalized) = 0 or length(normalized) > 120 then return null; end if;
  select count(*) into matches from public.profiles p where p.user_id = normalized or lower(p.username) = lower(normalized);
  if matches <> 1 then return null; end if;
  select u.email into resolved_email from public.profiles p join auth.users u on u.id = p.id where p.user_id = normalized or lower(p.username) = lower(normalized) limit 1;
  return resolved_email;
end;
$$;
revoke all on function public.get_email_for_login(text) from public;
grant execute on function public.get_email_for_login(text) to anon, authenticated;

create or replace function public.is_admin(p_user_id uuid)
returns boolean language sql stable security definer set search_path = pg_temp as $$
  select p_user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.get_all_users(p_admin_id uuid)
returns json language plpgsql stable security definer set search_path = pg_temp as $$
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  return coalesce((select json_agg(json_build_object('id', p.id, 'username', p.username, 'user_id', p.user_id, 'email', u.email, 'is_approved', p.is_approved, 'role', p.role, 'show_adult_content', p.show_adult_content, 'created_at', p.created_at) order by p.created_at desc) from public.profiles p join auth.users u on u.id = p.id), '[]'::json);
end;
$$;

create or replace function public.manage_user_approval(p_admin_id uuid, p_target_user_id uuid, p_approved boolean)
returns json language plpgsql security definer set search_path = pg_temp as $$
declare target_profile public.profiles;
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if p_admin_id = p_target_user_id and not p_approved then raise exception 'No puedes desaprobarte a ti mismo'; end if;
  update public.profiles set is_approved = p_approved where id = p_target_user_id returning * into target_profile;
  if not found then raise exception 'Usuario no encontrado'; end if;
  return json_build_object('success', true, 'user_id', target_profile.id, 'username', target_profile.username, 'is_approved', target_profile.is_approved);
end;
$$;

create or replace function public.change_user_role(p_admin_id uuid, p_target_user_id uuid, p_new_role text)
returns json language plpgsql security definer set search_path = pg_temp as $$
declare target_profile public.profiles;
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if p_new_role not in ('user', 'admin') then raise exception 'Rol invalido'; end if;
  if p_admin_id = p_target_user_id and p_new_role <> 'admin' then raise exception 'No puedes quitarte el rol de administrador'; end if;
  update public.profiles set role = p_new_role where id = p_target_user_id returning * into target_profile;
  if not found then raise exception 'Usuario no encontrado'; end if;
  return json_build_object('success', true, 'user_id', target_profile.id, 'username', target_profile.username, 'role', target_profile.role);
end;
$$;

create or replace function public.get_admin_stats(p_admin_id uuid)
returns json language plpgsql stable security definer set search_path = pg_temp as $$
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  return (select json_build_object('total_users', count(*), 'pending_users', count(*) filter (where not is_approved), 'approved_users', count(*) filter (where is_approved), 'admin_users', count(*) filter (where role = 'admin')) from public.profiles);
end;
$$;
revoke all on function public.is_admin(uuid), public.get_all_users(uuid), public.manage_user_approval(uuid, uuid, boolean), public.change_user_role(uuid, uuid, text), public.get_admin_stats(uuid) from public;
grant execute on function public.is_admin(uuid), public.get_all_users(uuid), public.manage_user_approval(uuid, uuid, boolean), public.change_user_role(uuid, uuid, text), public.get_admin_stats(uuid) to authenticated;

-- Telemetría remota: tablas instaladas, pero deja VITE_TELEMETRY_* en false hasta decidir activarla.
create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, session_id text not null, event_id text,
  type text not null check (type in ('error', 'request_error', 'page_metric', 'playback_metric', 'history_sync', 'alert')), ts_client timestamptz not null, page text,
  meta jsonb not null default '{}'::jsonb check (octet_length(meta::text) <= 16384), app_version text, platform text check (platform in ('web', 'electron', 'unknown')), inserted_at timestamptz not null default now()
);
create index if not exists telemetry_events_type_inserted_idx on public.telemetry_events (type, inserted_at desc);
create index if not exists telemetry_events_user_inserted_idx on public.telemetry_events (user_id, inserted_at desc);
alter table public.telemetry_events enable row level security;
drop policy if exists telemetry_events_insert_any on public.telemetry_events;
create policy telemetry_events_insert_any on public.telemetry_events for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists telemetry_events_select_own on public.telemetry_events;
create policy telemetry_events_select_own on public.telemetry_events for select to authenticated using (user_id = auth.uid());

create table if not exists public.telemetry_alerts (
  id uuid primary key default gen_random_uuid(), rule text not null, severity text not null check (severity in ('info', 'warn', 'critical')),
  payload jsonb not null default '{}'::jsonb check (octet_length(payload::text) <= 8192), user_id uuid references auth.users(id) on delete set null, session_id text not null,
  app_version text, platform text check (platform in ('web', 'electron', 'unknown')), triggered_at timestamptz not null default now(), acknowledged boolean not null default false, acknowledged_at timestamptz
);
create index if not exists telemetry_alerts_rule_idx on public.telemetry_alerts (rule, triggered_at desc);
create index if not exists telemetry_alerts_open_idx on public.telemetry_alerts (acknowledged, triggered_at desc) where acknowledged = false;
alter table public.telemetry_alerts enable row level security;
drop policy if exists telemetry_alerts_insert_any on public.telemetry_alerts;
create policy telemetry_alerts_insert_any on public.telemetry_alerts for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists telemetry_alerts_select_own on public.telemetry_alerts;
create policy telemetry_alerts_select_own on public.telemetry_alerts for select to authenticated using (user_id = auth.uid());

-- Después de registrarte, promueve solo tu cuenta inicial desde SQL Editor:
-- update public.profiles set role = 'admin', is_approved = true where id = 'UUID_DE_AUTH_USERS';
