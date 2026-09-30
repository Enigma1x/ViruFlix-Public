-- Admin Panel - Funciones RPC para gestión de usuarios (CORREGIDO)
--
-- Primero elimina las funciones antiguas para recrearlas con parámetros corregidos

-- Eliminar funciones antiguas si existen
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.get_all_users(uuid);
DROP FUNCTION IF EXISTS public.manage_user_approval(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.change_user_role(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_admin_stats(uuid);

-- Función para verificar si el usuario actual es admin
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = p_user_id;
  return user_role = 'admin';
end;
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

comment on function public.is_admin(uuid) is 'Verifica si un usuario es administrador.';

-- Función para obtener todos los usuarios (solo admins)
create or replace function public.get_all_users(p_admin_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
declare
  result json;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'No autorizado';
  end if;

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
  )
  into result
  from public.profiles p
  join auth.users u on u.id = p.id;

  return coalesce(result, '[]'::json);
end;
$$;

revoke all on function public.get_all_users(uuid) from public;
grant execute on function public.get_all_users(uuid) to authenticated;

comment on function public.get_all_users(uuid) is 'Obtiene todos los usuarios. Solo admins.';

-- Función para aprobar/rechazar usuarios (solo admins)
create or replace function public.manage_user_approval(p_admin_id uuid, p_target_user_id uuid, p_approved boolean)
returns json
language plpgsql
security definer
set search_path = pg_temp
as $$
declare
  target_profile record;
  result json;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'No autorizado';
  end if;

  if p_admin_id = p_target_user_id and not p_approved then
    raise exception 'No puedes desaprobarte a ti mismo';
  end if;

  update public.profiles
  set is_approved = p_approved, updated_at = now()
  where id = p_target_user_id
  returning * into target_profile;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  result := json_build_object(
    'success', true,
    'user_id', target_profile.id,
    'username', target_profile.username,
    'is_approved', target_profile.is_approved
  );

  return result;
end;
$$;

revoke all on function public.manage_user_approval(uuid, uuid, boolean) from public;
grant execute on function public.manage_user_approval(uuid, uuid, boolean) to authenticated;

comment on function public.manage_user_approval(uuid, uuid, boolean) is
  'Aprueba o rechaza un usuario. Solo admins.';

-- Función para cambiar el rol de un usuario (solo admins)
create or replace function public.change_user_role(p_admin_id uuid, p_target_user_id uuid, p_new_role text)
returns json
language plpgsql
security definer
set search_path = pg_temp
as $$
declare
  target_profile record;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'No autorizado';
  end if;

  if p_new_role not in ('user', 'admin') then
    raise exception 'Rol inválido';
  end if;

  if p_admin_id = p_target_user_id and p_new_role != 'admin' then
    raise exception 'No puedes quitarte el rol de administrador';
  end if;

update public.profiles
  set role = p_new_role, updated_at = now()
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

revoke all on function public.change_user_role(uuid, uuid, text) from public;
grant execute on function public.change_user_role(uuid, uuid, text) to authenticated;

comment on function public.change_user_role(uuid, uuid, text) is
  'Cambia el rol de un usuario. Solo admins.';

-- Función para obtener estadísticas del panel (solo admins)
create or replace function public.get_admin_stats(p_admin_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
declare
  result json;
  total_users int;
  pending_users int;
  approved_users int;
  admin_users int;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'No autorizado';
  end if;

  select count(*) into total_users from public.profiles;
  select count(*) into pending_users from public.profiles where is_approved = false;
  select count(*) into approved_users from public.profiles where is_approved = true;
  select count(*) into admin_users from public.profiles where role = 'admin';

  result := json_build_object(
    'total_users', total_users,
    'pending_users', pending_users,
    'approved_users', approved_users,
    'admin_users', admin_users
  );

  return result;
end;
$$;

revoke all on function public.get_admin_stats(uuid) from public;
grant execute on function public.get_admin_stats(uuid) to authenticated;

comment on function public.get_admin_stats(uuid) is
  'Obtiene estadísticas del panel de administración. Solo admins.';
