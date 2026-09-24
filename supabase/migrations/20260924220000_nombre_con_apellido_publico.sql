-- Pedido de Miguel (24-sep-2026, noche): en la web de reserva el cliente escribe "Nombre y
-- apellido" (dos palabras como mínimo), igual que ya exige el mostrador de los talleres con
-- mostrador_datos_obligatorios. La web lo comprueba antes (validacion.ts, nombreConApellido); esto
-- es la garantía. Mismo código que en el mostrador: CT023.
-- (La descripción obligatoria en "Avería / luz de aviso" y "Otro" es configuración de cada taller:
-- descripcion_modo = 'obligatoria' en los seeds de Speed Bikes y Rik and Roll; no cambia el esquema.)
-- Misma firma que en 20260920200000_config_taller: se conservan los permisos (anon, authenticated, service_role).
create or replace function public.crear_reserva_publica(
  p_taller_id   bigint,
  p_matricula   text,
  p_nombre      text,
  p_telefono    text,
  p_vehiculo    text,
  p_servicio    text,
  p_descripcion text,
  p_dia         date,
  p_hora        time without time zone,
  p_datos_extra jsonb default '{}'::jsonb
)
returns table (reserva_id bigint, token_publico uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v            record;
  v_activas    integer;
  v_hoy        integer;
  v_id         bigint;
  v_token      uuid;
begin
  if coalesce(btrim(p_nombre), '') = '' or coalesce(btrim(p_vehiculo), '') = '' then
    raise exception 'Faltan el nombre o el vehículo' using errcode = 'CT008';
  end if;

  -- Nombre y primer apellido (24-sep-2026).
  if btrim(p_nombre) !~ '\S\s+\S' then
    raise exception 'Escribe el nombre y el primer apellido' using errcode = 'CT023';
  end if;

  select * into v from public.validar_datos_reserva(p_taller_id, p_servicio, p_descripcion, p_dia, p_hora, p_telefono, p_matricula, p_datos_extra, false);

  -- Límites por teléfono contra el abuso: 3 citas activas por taller y 5 creaciones al día.
  select count(*) into v_activas
  from public.reservas r
  where r.taller_id = p_taller_id and r.telefono = v.telefono and r.estado in ('Pendiente', 'Confirmada') and r.dia >= (now() at time zone 'Europe/Madrid')::date;
  if v_activas >= 3 then
    raise exception 'Demasiadas citas activas con este teléfono' using errcode = 'CT006';
  end if;

  select count(*) into v_hoy
  from public.reservas r
  where r.taller_id = p_taller_id and r.telefono = v.telefono and r.created_at >= date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
  if v_hoy >= 5 then
    raise exception 'Demasiadas solicitudes hoy con este teléfono' using errcode = 'CT006';
  end if;

  insert into public.reservas
    (taller_id, matricula, nombre, telefono, vehiculo, servicio, servicio_id, descripcion, dia, hora, estado, datos_extra, kilometros, creada_por)
  values
    (p_taller_id, v.matricula, left(btrim(p_nombre), 120), v.telefono, left(btrim(p_vehiculo), 120), p_servicio, v.servicio_id, v.descripcion, p_dia, p_hora, 'Pendiente', v.datos_extra,
     nullif(v.datos_extra ->> 'kilometros', '')::integer, 'cliente')
  returning id, reservas.token_publico into v_id, v_token;

  return query select v_id, v_token;
end;
$$;
comment on function public.crear_reserva_publica(bigint, text, text, text, text, text, text, date, time without time zone, jsonb) is
  'Solicitud de cita del cliente (anon). Nace Pendiente. CT008 datos, CT023 nombre sin apellido, CT006 límites por teléfono; el resto en validar_datos_reserva.';

notify pgrst, 'reload schema';
