-- "Vehículo listo" termina la cita (pedido de Miguel, 22-sep-2026). Hasta ahora el botón solo abría
-- WhatsApp; ahora además deja la cita marcada como terminada:
--   · la cabecera del panel cuenta solo lo que falta por terminar ("Hoy: 2 por terminar");
--   · la tarjeta sigue en su sitio con "✓ Lista · avisado a las 12:30" y se puede volver a avisar.
--
-- No es un estado nuevo: la cita sigue Confirmada (así no cambian la capacidad, los recordatorios,
-- el enlace del cliente ni las Edge Functions). Solo se guarda cuándo se marcó.
--
-- El panel no tiene UPDATE en reservas (fase 4), así que marca con una función propia que comprueba
-- que la cita es de su taller, está confirmada y es de hoy o de antes. La hora la pone el servidor.

-- La tabla es pequeña, pero el check la recorre con bloqueo exclusivo: mejor fallar que esperar.
set lock_timeout = '5s';

alter table public.reservas
  add column listo_en timestamptz;

-- Una solicitud sin confirmar no puede estar terminada. (Una cita lista que luego se cancela conserva
-- la marca: no molesta, porque solo cuentan las confirmadas.)
alter table public.reservas
  add constraint reservas_listo_en_check check (listo_en is null or estado <> 'Pendiente');

comment on column public.reservas.listo_en is 'Cuándo se pulsó "Vehículo listo" por última vez (la cita está terminada). Null = por terminar. Se marca con marcar_vehiculo_listo().';

-- authenticated ya tiene SELECT de tabla en reservas (con la RLS de su taller): lee listo_en sin más.
-- anon no tiene nada en reservas.

create function public.marcar_vehiculo_listo(p_reserva_id bigint, p_listo boolean default true)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_filas integer;
  v_listo timestamptz;
begin
  update public.reservas r
     set listo_en = case when coalesce(p_listo, true) then now() end
   where r.id = p_reserva_id
     and r.estado = 'Confirmada'
     -- Solo hoy o días pasados: marcar la de mañana es un error (y su recordatorio saldría igual).
     and r.dia <= (now() at time zone 'Europe/Madrid')::date
     and r.taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid()))
  returning r.listo_en into v_listo;

  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    raise exception 'La cita no es de tu taller, ya no está confirmada o aún no es su día' using errcode = 'CT019';
  end if;

  return v_listo;
end;
$$;

comment on function public.marcar_vehiculo_listo(bigint, boolean) is 'Panel: marca (p_listo = true, con la hora del servidor) o desmarca una cita confirmada de su taller, de hoy o anterior, como terminada. CT019 si no.';

revoke all on function public.marcar_vehiculo_listo(bigint, boolean) from public, anon;
grant execute on function public.marcar_vehiculo_listo(bigint, boolean) to authenticated;

notify pgrst, 'reload schema';
