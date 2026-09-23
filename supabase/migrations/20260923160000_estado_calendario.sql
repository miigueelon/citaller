-- ============================================================================
-- El panel sabe si su taller tiene Google Calendar conectado (Miguel, 23-sep-2026: "cuando el
-- Google Calendar está conectado sigue saliendo como Conectar Google Calendar").
--
-- integraciones_calendario sigue cerrada al navegador (guarda la referencia al token): esta función
-- solo devuelve si hay conexión y desde cuándo, y solo para el taller del usuario que pregunta.
-- Sin fila (otro taller o sin conexión) = no conectado.
-- ============================================================================

create function public.estado_calendario(p_taller_id bigint)
returns table (conectado boolean, conectado_desde timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select ic.conectado, ic.updated_at
  from public.integraciones_calendario ic
  join public.talleres t on t.id = ic.taller_id
  where ic.taller_id = p_taller_id
    and ic.proveedor = 'google'
    and t.user_id = (select auth.uid());
$$;

comment on function public.estado_calendario(bigint) is 'Panel: si el taller del usuario tiene Google Calendar conectado y desde cuándo. Nunca devuelve el token.';

revoke all on function public.estado_calendario(bigint) from public, anon;
grant execute on function public.estado_calendario(bigint) to authenticated;

notify pgrst, 'reload schema';
