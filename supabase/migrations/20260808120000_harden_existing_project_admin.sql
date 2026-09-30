-- Viruflix: correcciones para un proyecto Supabase YA EXISTENTE.
-- Basada en la auditoria de estructura del 2026-08-08.
-- No recrea tablas ni borra datos.

-- Las RPC administrativas originales escriben updated_at, pero la tabla actual
-- no tiene esa columna. El trigger mantiene el valor correcto para cualquier
-- actualizacion futura del perfil.
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Habia dos indices unicos identicos en watch_history. Se conserva el indice
-- creado por la restriccion original y se elimina el indice adicional de la
-- migracion de Realtime.
drop index if exists public.watch_history_user_content_type_uidx;

-- Endurecimiento de administracion:
-- las versiones anteriores confiaban en p_admin_id, valor controlable por el
-- cliente. Ahora las funciones exigen que coincida con auth.uid() y que ese
-- usuario autenticado tenga role = 'admin'.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_temp
as $$
  select p_user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

create or replace function public.get_all_users(p_admin_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  return coalesce(
    (
      select json_agg(
        json_build_object(
          'id', p.id,
          'username', p.username,
          'user_id', p.user_id,
          'email', u.email,
          'is_approved', p.is_approved,
          'role', p.role,
          'show_adult_content', p.show_adult_content,
          'created_at', p.created_at
        )
        order by p.created_at desc
      )
      from public.profiles p
      join auth.users u on u.id = p.id
    ),
    '[]'::json
  );
end;
$$;

create or replace function public.manage_user_approval(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_approved boolean
)
returns json
language plpgsql
security definer
set search_path = pg_temp
as $$
declare
  target_profile public.profiles;
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_admin_id = p_target_user_id and not p_approved then
    raise exception 'No puedes desaprobarte a ti mismo';
  end if;

  update public.profiles
  set is_approved = p_approved
  where id = p_target_user_id
  returning * into target_profile;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  return json_build_object(
    'success', true,
    'user_id', target_profile.id,
    'username', target_profile.username,
    'is_approved', target_profile.is_approved
  );
end;
$$;

create or replace function public.change_user_role(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns json
language plpgsql
security definer
set search_path = pg_temp
as $$
declare
  target_profile public.profiles;
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_new_role not in ('user', 'admin') then
    raise exception 'Rol inválido';
  end if;

  if p_admin_id = p_target_user_id and p_new_role <> 'admin' then
    raise exception 'No puedes quitarte el rol de administrador';
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_target_user_id
  returning * into target_profile;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  return json_build_object(
    'success', true,
    'user_id', target_profile.id,
    'username', target_profile.username,
    'role', target_profile.role
  );
end;
$$;

create or replace function public.get_admin_stats(p_admin_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
begin
  if p_admin_id is distinct from auth.uid() or not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  return (
    select json_build_object(
      'total_users', count(*),
      'pending_users', count(*) filter (where not is_approved),
      'approved_users', count(*) filter (where is_approved),
      'admin_users', count(*) filter (where role = 'admin')
    )
    from public.profiles
  );
end;
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.get_all_users(uuid) from public;
revoke all on function public.manage_user_approval(uuid, uuid, boolean) from public;
revoke all on function public.change_user_role(uuid, uuid, text) from public;
revoke all on function public.get_admin_stats(uuid) from public;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.get_all_users(uuid) to authenticated;
grant execute on function public.manage_user_approval(uuid, uuid, boolean) to authenticated;
grant execute on function public.change_user_role(uuid, uuid, text) to authenticated;
grant execute on function public.get_admin_stats(uuid) to authenticated;
