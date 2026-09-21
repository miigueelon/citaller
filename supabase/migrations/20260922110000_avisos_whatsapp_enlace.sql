-- Modo enlace: al pulsar un botón de aviso por WhatsApp, la cita queda marcada como avisada (pedido de
-- Miguel, 22-sep-2026: "que ya salga ticada como hecho, igual que la de finalizar cita"). La tarjeta
-- dice "✓ Confirmación avisada a las 12:30" y el botón pasa a "Volver a avisar".
--
-- No hacen falta columnas nuevas: se usan las de la fase 5 (modo api), que en modo enlace estaban
-- sin usar: whatsapp_{confirmacion,cancelacion}_enviada / _fecha y whatsapp_recordatorio_enviado / _fecha.
-- Significan lo mismo en los dos modos: "este aviso ya se mandó". En modo enlace las Edge Functions no
-- las miran (salen antes, por el modo), y el cron de recordatorios solo manda las que siguen sin
-- enviar, así que marcarlas no cambia nada fuera del panel.
--
-- Como "Vehículo listo": el panel no tiene UPDATE en reservas, marca con una función propia que
-- comprueba que la cita es de su taller y está en el estado que toca. La hora la pone el servidor.

create function public.marcar_aviso_whatsapp(p_reserva_id bigint, p_tipo text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_ahora  timestamptz := now();
  v_filas  integer;
begin
  -- La confirmación y el recordatorio se mandan de citas confirmadas; la cancelación, de canceladas.
  v_estado := case p_tipo
    when 'confirmacion' then 'Confirmada'
    when 'recordatorio' then 'Confirmada'
    when 'cancelacion' then 'Cancelada'
  end;
  if v_estado is null then
    raise exception 'Tipo de aviso desconocido: %', p_tipo using errcode = '22023';
  end if;

  update public.reservas r
     set whatsapp_confirmacion_enviada = r.whatsapp_confirmacion_enviada or p_tipo = 'confirmacion',
         whatsapp_confirmacion_fecha   = case when p_tipo = 'confirmacion' then v_ahora else r.whatsapp_confirmacion_fecha end,
         whatsapp_cancelacion_enviada  = r.whatsapp_cancelacion_enviada or p_tipo = 'cancelacion',
         whatsapp_cancelacion_fecha    = case when p_tipo = 'cancelacion' then v_ahora else r.whatsapp_cancelacion_fecha end,
         whatsapp_recordatorio_enviado = r.whatsapp_recordatorio_enviado or p_tipo = 'recordatorio',
         whatsapp_recordatorio_fecha   = case when p_tipo = 'recordatorio' then v_ahora else r.whatsapp_recordatorio_fecha end,
         -- Como el envío por la API cuando va bien: un error antiguo ya no aplica.
         whatsapp_error                = null
   where r.id = p_reserva_id
     and r.estado = v_estado
     and r.taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid()));

  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    raise exception 'La cita no es de tu taller o ha cambiado de estado' using errcode = 'CT020';
  end if;

  return v_ahora;
end;
$$;

comment on function public.marcar_aviso_whatsapp(bigint, text) is 'Panel (modo enlace): apunta que se mandó el aviso de WhatsApp (confirmacion, cancelacion o recordatorio) con la hora del servidor. CT020 si la cita no es del taller o no está en el estado del aviso.';

revoke all on function public.marcar_aviso_whatsapp(bigint, text) from public, anon;
grant execute on function public.marcar_aviso_whatsapp(bigint, text) to authenticated;

notify pgrst, 'reload schema';
