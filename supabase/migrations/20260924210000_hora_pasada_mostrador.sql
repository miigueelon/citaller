-- Pedido de Miguel (24-sep-2026, noche): en "Nueva cita" del panel una hora de hoy que ya ha pasado
-- no se puede escoger. Hasta ahora el taller podía apuntar a cualquier hora del día (el panel solo
-- avisaba); la base de datos rechazaba el día pasado (CT004) pero no la hora pasada de hoy.
-- Código nuevo CT024 ("Esa hora ya ha pasado"), tanto para el taller como para el público (antes el
-- público lo recibía como CT004, que se confunde con "día fuera de rango").
-- Misma firma que en 20260924190000_mostrador_datos_obligatorios: solo cambia el bloque de fecha y hora.
create or replace function public.validar_datos_reserva(
  p_taller_id   bigint,
  p_servicio    text,
  p_descripcion text,
  p_dia         date,
  p_hora        time without time zone,
  p_telefono    text,
  p_matricula   text,
  p_datos_extra jsonb,
  p_es_taller   boolean
)
returns table (servicio_id bigint, telefono text, matricula text, datos_extra jsonb, descripcion text)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_activo      boolean;
  v_servicio    record;
  v_campo       record;
  v_valor       text;
  v_opciones    jsonb;
  v_telefono    text;
  v_matricula   text;
  v_datos       jsonb := '{}'::jsonb;
  v_hoy_madrid  date := (now() at time zone 'Europe/Madrid')::date;
  v_minimo      timestamp;
begin
  select t.activo into v_activo from public.talleres t where t.id = p_taller_id;
  if v_activo is distinct from true then
    raise exception 'El taller no existe o no admite reservas' using errcode = 'CT009';
  end if;

  select s.id, s.descripcion_modo into v_servicio
  from public.servicios_taller s
  where s.taller_id = p_taller_id and s.nombre = p_servicio and s.activo;
  if v_servicio.id is null then
    raise exception 'Servicio no disponible: %', p_servicio using errcode = 'CT007';
  end if;

  if v_servicio.descripcion_modo = 'obligatoria' and coalesce(btrim(p_descripcion), '') = '' then
    raise exception 'Este servicio necesita una descripción' using errcode = 'CT008';
  end if;

  if p_dia is null or p_hora is null then
    raise exception 'Faltan el día o la hora' using errcode = 'CT002';
  end if;

  if exists (select 1 from public.festivos_taller f where f.taller_id = p_taller_id and f.fecha = p_dia) then
    raise exception 'El taller cierra ese día' using errcode = 'CT003';
  end if;

  if p_dia > v_hoy_madrid + 90 then
    raise exception 'Solo se admiten citas hasta 90 días vista' using errcode = 'CT004';
  end if;

  if p_dia < v_hoy_madrid then
    raise exception 'La fecha ya ha pasado' using errcode = 'CT004';
  end if;

  -- El público solo puede pedir horas del horario; el taller, cualquiera (el panel avisa si está
  -- fuera del horario o llena). Ninguno de los dos puede apuntar una hora que ya ha pasado.
  if not p_es_taller and not exists (
    select 1 from public.horarios_taller h
    where h.taller_id = p_taller_id and h.dia_semana = extract(dow from p_dia)::integer and h.hora = p_hora
  ) then
    raise exception 'El taller no atiende a esa hora' using errcode = 'CT002';
  end if;
  if ((p_dia + p_hora) at time zone 'Europe/Madrid') <= now() then
    raise exception 'Esa hora ya ha pasado' using errcode = 'CT024';
  end if;

  v_telefono := public.normalizar_telefono(p_telefono);
  if p_es_taller and coalesce(v_telefono, '') = '' then
    v_telefono := null;
  elsif not public.es_telefono_valido(v_telefono) then
    raise exception 'Teléfono no válido' using errcode = 'CT005';
  end if;

  v_matricula := upper(regexp_replace(coalesce(p_matricula, ''), '[\s-]', '', 'g'));
  if v_matricula !~ '^[A-Z0-9]{4,10}$' then
    raise exception 'Matrícula no válida' using errcode = 'CT013';
  end if;

  -- Datos extra: solo se guardan las claves definidas para el taller y el servicio.
  for v_campo in
    select c.clave, c.tipo, c.opciones, c.opciones_panel, c.obligatorio
    from public.campos_formulario_taller c
    where c.taller_id = p_taller_id and (c.servicio_id is null or c.servicio_id = v_servicio.id)
  loop
    v_valor := nullif(btrim(coalesce(p_datos_extra, '{}'::jsonb) ->> v_campo.clave), '');
    if v_valor is null then
      if v_campo.obligatorio then
        raise exception 'Falta el campo %', v_campo.clave using errcode = 'CT008';
      end if;
      continue;
    end if;
    if v_campo.tipo = 'numero' then
      if v_valor !~ '^[0-9]{1,9}$' then
        raise exception 'El campo % debe ser un número', v_campo.clave using errcode = 'CT008';
      end if;
      v_datos := v_datos || jsonb_build_object(v_campo.clave, v_valor::bigint);
    elsif v_campo.tipo = 'select' then
      -- El taller puede tener su propia lista (opciones_panel); el público, la de siempre.
      v_opciones := case when p_es_taller and v_campo.opciones_panel is not null then v_campo.opciones_panel else v_campo.opciones end;
      if not (v_opciones ? v_valor) then
        raise exception 'Valor no válido para %', v_campo.clave using errcode = 'CT008';
      end if;
      v_datos := v_datos || jsonb_build_object(v_campo.clave, v_valor);
    else
      v_datos := v_datos || jsonb_build_object(v_campo.clave, left(v_valor, 250));
    end if;
  end loop;

  -- Antelación del servicio (23-sep-2026): solo para las solicitudes de clientes. La hora la pone el
  -- servidor, igual que en la RPC antelacion_minima que consulta la web.
  if not p_es_taller then
    v_minimo := public.antelacion_minima_en(p_taller_id, v_servicio.id, now());
    if v_minimo is not null and (p_dia + p_hora) < v_minimo then
      raise exception 'Este servicio necesita más antelación: la primera hora posible es el % a las %',
        to_char(v_minimo, 'DD/MM/YYYY'), to_char(v_minimo, 'HH24:MI')
        using errcode = 'CT021';
    end if;
  end if;

  return query select v_servicio.id, v_telefono, v_matricula, v_datos, nullif(left(btrim(coalesce(p_descripcion, '')), 500), '');
end;
$$;
comment on function public.validar_datos_reserva(bigint, text, text, date, time without time zone, text, text, jsonb, boolean) is
  'Validación común de crear_reserva_publica e insertar_reserva_taller. Errores CT002-CT009, CT013, CT024 (hora ya pasada, también para el taller) y, para clientes, CT021 (antelación). En las citas del taller un select acepta opciones_panel si existe.';

notify pgrst, 'reload schema';
