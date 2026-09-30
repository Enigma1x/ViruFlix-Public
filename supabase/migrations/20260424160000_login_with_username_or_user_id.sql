-- Permite iniciar sesión con el nombre de usuario o con el user_id personalizado
-- (ID "u_xxxxxxxx") además del email.
--
-- Supabase Auth sólo sabe autenticar por email; el cliente sigue llamando
-- supabase.auth.signInWithPassword({ email, password }). Esta función
-- resuelve primero un identificador (username o user_id) al email del
-- auth.users asociado para que el cliente pueda hacer el login.
--
-- Seguridad:
--   * SECURITY DEFINER: corre con privilegios del owner para poder leer
--     auth.users (anon normalmente no puede).
--   * search_path fijado a pg_temp para evitar hijacking de esquema.
--   * Se exige un identificador no vacío y de longitud razonable.
--   * Si no hay match o hay varios matches (username duplicado), devolvemos
--     NULL para que el cliente lance un error genérico y evite la
--     enumeración de usuarios.
--   * GRANT EXECUTE a anon + authenticated para habilitar el flujo pre-sesión.

create or replace function public.get_email_for_login(identifier text)
returns text
language plpgsql
stable
security definer
set search_path = pg_temp
as $$
declare
  trimmed_identifier text;
  resolved_email text;
  match_count int;
begin
  if identifier is null then
    return null;
  end if;

  trimmed_identifier := trim(identifier);

  if length(trimmed_identifier) = 0 or length(trimmed_identifier) > 120 then
    return null;
  end if;

  -- Exige coincidencia exacta (case-sensitive en user_id; los user_id son lowercase).
  -- Para username comparamos case-insensitive pero exigimos unicidad.
  select count(*)
    into match_count
  from public.profiles p
  where p.user_id = trimmed_identifier
     or lower(p.username) = lower(trimmed_identifier);

  if match_count <> 1 then
    return null;
  end if;

  select u.email
    into resolved_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.user_id = trimmed_identifier
     or lower(p.username) = lower(trimmed_identifier)
  limit 1;

  return resolved_email;
end;
$$;

revoke all on function public.get_email_for_login(text) from public;
grant execute on function public.get_email_for_login(text) to anon, authenticated;

comment on function public.get_email_for_login(text) is
  'Devuelve el email del auth.users asociado a un username o user_id, o NULL si no hay match único. Usado por el login para permitir identificador además del email.';
