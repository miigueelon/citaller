-- ============================================================================
-- FASE 3.5 (docs/plan.md): el cliente consulta y cancela su cita desde /<slug>/cita/<token>.
-- Regla: se puede cancelar hasta 24 horas antes (hora de Madrid). Sin comprobación extra:
-- el token (uuid) es la credencial. Nunca se devuelve el teléfono del cliente.
-- ============================================================================

-- Datos mínimos de la cita para la página del cliente. La ejecuta anon con el token.
create function public.consultar_cita_cliente(p_token uuid)
returns table (
  taller_nombre       text,
  taller_slug         text,
  taller_telefono     text,
  nombre              text,
  vehiculo            text,
  matricula           text,
  servicio            text,
  dia                 date,
  hora                time without time zone,
  estado              text,
  cancelada_por       text,
  puede_cancelar      boolean,
  limite_cancelacion  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.nombre, t.slug, t.telefono,
         r.nombre, r.vehiculo, r.matricula, r.servicio, r.dia, r.hora, r.estado, r.cancelada_por,
         (r.estado in ('Pendiente', 'Confirmada')
            and ((r.dia + r.hora) at time zone 'Europe/Madrid') - interval '24 hours' >= now()) as puede_cancelar,
         ((r.dia + r.hora) at time zone 'Europe/Madrid') - interval '24 hours' as limite_cancelacion
  from public.reservas r
  join public.talleres t on t.id = r.taller_id
  where r.token_publico = p_token;
$$;

revoke all on function public.consultar_cita_cliente(uuid) from public;
grant execute on function public.consultar_cita_cliente(uuid) to anon, authenticated, service_role;

-- Cancelación por el cliente. Solo service_role: la llama la Edge Function cancelar-cita-cliente,
-- que después borra el evento de Google a mejor esfuerzo.
create function public.cancelar_reserva_cliente(p_token uuid)
returns table (reserva_id bigint, taller_id bigint, google_event_id text, estado_anterior text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select r.id, r.taller_id, r.google_event_id, r.estado, r.dia, r.hora into v
  from public.reservas r
  where r.token_publico = p_token
  for update;

  if v.id is null then
    raise exception 'Cita no encontrada' using errcode = 'CT010';
  end if;
  if v.estado = 'Cancelada' then
    raise exception 'La cita ya estaba cancelada' using errcode = 'CT012';
  end if;
  if ((v.dia + v.hora) at time zone 'Europe/Madrid') - interval '24 hours' < now() then
    raise exception 'Ya no se puede cancelar por internet' using errcode = 'CT011';
  end if;

  update public.reservas
  set estado = 'Cancelada', cancelada_por = 'cliente'
  where id = v.id;

  return query select v.id, v.taller_id, v.google_event_id, v.estado;
end;
$$;

revoke all on function public.cancelar_reserva_cliente(uuid) from public, anon, authenticated;
grant execute on function public.cancelar_reserva_cliente(uuid) to service_role;
