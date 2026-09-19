-- ============================================================================
-- FASE 1.3 (docs/plan.md): refresh tokens de Google Calendar cifrados en Supabase Vault y
-- datos de vuelta del flujo OAuth.
--
-- Transición sin tocar datos existentes: la fila de Rik and Roll conserva su refresh token en
-- claro hasta que el taller vuelva a conectar Google; a partir de ese momento el callback lo
-- guarda en Vault y deja la columna en claro a null. Las Edge Functions leen primero de Vault
-- y, si no hay secreto, de la columna antigua.
-- ============================================================================

alter table public.integraciones_calendario
  add column refresh_token_secret_id uuid,
  alter column refresh_token drop not null;

alter table public.integraciones_calendario
  add constraint integraciones_calendario_token_presente
    check (refresh_token is not null or refresh_token_secret_id is not null);

comment on column public.integraciones_calendario.refresh_token is
  'OBSOLETA: refresh token en claro. Solo lo conservan conexiones anteriores al 19-sep-2026; las nuevas usan refresh_token_secret_id.';
comment on column public.integraciones_calendario.refresh_token_secret_id is
  'Id del secreto en vault.secrets con el refresh token (cifrado).';

-- Quién inició la conexión y a qué URL de la app hay que volver (validada contra una lista
-- de orígenes permitidos en la Edge Function conectar-google-calendar).
alter table public.google_oauth_states
  add column user_id uuid,
  add column volver_a text;

-- ----------------------------------------------------------------------------
-- Funciones de acceso a Vault. Solo las ejecuta service_role (Edge Functions): Vault no está
-- expuesto por la API y estas funciones son la única puerta.
-- ----------------------------------------------------------------------------
create function public.guardar_token_calendario(
  p_taller_id bigint,
  p_proveedor text,
  p_refresh_token text,
  p_scope text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre    text := format('citaller_calendario_%s_taller_%s', p_proveedor, p_taller_id);
  v_secret_id uuid;
begin
  if coalesce(length(p_refresh_token), 0) = 0 then
    raise exception 'refresh token vacío';
  end if;

  select s.id into v_secret_id from vault.secrets s where s.name = v_nombre;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_refresh_token,
      v_nombre,
      format('Refresh token de %s Calendar del taller %s (CiTaller)', p_proveedor, p_taller_id)
    );
  else
    perform vault.update_secret(v_secret_id, p_refresh_token);
  end if;

  insert into public.integraciones_calendario as ic
    (taller_id, proveedor, calendar_id, refresh_token, refresh_token_secret_id, scope, conectado, updated_at)
  values
    (p_taller_id, p_proveedor, 'primary', null, v_secret_id, p_scope, true, now())
  on conflict (taller_id, proveedor) do update
    set refresh_token           = null,
        refresh_token_secret_id = excluded.refresh_token_secret_id,
        scope                   = coalesce(excluded.scope, ic.scope),
        conectado               = true,
        updated_at              = now();
end;
$$;

create function public.leer_token_calendario(p_taller_id bigint, p_proveedor text)
returns table (refresh_token text, calendar_id text, conectado boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(ds.decrypted_secret, ic.refresh_token), ic.calendar_id, ic.conectado
  from public.integraciones_calendario ic
  left join vault.decrypted_secrets ds on ds.id = ic.refresh_token_secret_id
  where ic.taller_id = p_taller_id
    and ic.proveedor = p_proveedor;
$$;

revoke all on function public.guardar_token_calendario(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.leer_token_calendario(bigint, text)                from public, anon, authenticated;
grant execute on function public.guardar_token_calendario(bigint, text, text, text) to service_role;
grant execute on function public.leer_token_calendario(bigint, text)                to service_role;
