-- Antelación por servicio (pedido de Miguel, 23-sep-2026): en Rik and Roll, "Neumáticos" solo se
-- puede reservar cuando el taller ha tenido un bloque de apertura entero (una mañana o una tarde)
-- para pedir los neumáticos y recibirlos. Con su horario (8:30-12:30 y 15:30-18:30):
--   · solicitud por la noche  → la mañana siguiente es para recibirlos → primera hora, las 15:30
--   · solicitud por la tarde  → primera hora, la mañana siguiente
--   · solicitud por la mañana → primera hora, esa misma tarde
--   · viernes por la tarde o fin de semana → se reciben el lunes por la mañana → lunes a las 15:30
-- Nada de esto va en el código con un "si es Rik and Roll": es configuración por servicio
-- (`servicios_taller.bloques_antelacion`) y los bloques salen del horario (`horarios_taller.bloque`).
--
-- 1. `horarios_taller.bloque`: a qué bloque de apertura pertenece cada hora (1 = mañana, 2 = tarde).
--    Se rellena con la regla "antes de las 14:00 es mañana", que vale para los tres talleres de hoy;
--    los seeds lo dicen explícitamente a partir de ahora.
-- 2. `servicios_taller.bloques_antelacion` (0 = como hasta ahora) y `antelacion_texto` (lo que la web
--    explica al cliente junto a la primera hora posible).
-- 3. `antelacion_minima_en(taller, servicio, instante)`: primera hora reservable para ese servicio si
--    la solicitud se hace en ese instante (null si el servicio no tiene antelación). Interna: la usan
--    `validar_datos_reserva` y la RPC pública `antelacion_minima(taller, servicio)`, que es la que
--    llama la web (siempre con el `now()` del servidor, nunca con la hora del móvil).
-- 4. `validar_datos_reserva`: una solicitud de cliente anterior a esa hora se rechaza con CT021. Las
--    citas apuntadas a mano desde el panel no se limitan: el taller sabe si tiene el material.
--
-- Compatible hacia atrás: con `bloques_antelacion = 0` en todos los servicios nada cambia. Neumáticos
-- de Rik and Roll pasa a 1 con su seed cuando se publique el frontend (con el OK de Miguel).

set lock_timeout = '5s';

-- ----------------------------------------------------------------------------
-- 1. Bloque de apertura de cada hora
-- ----------------------------------------------------------------------------
alter table public.horarios_taller
  add column bloque smallint not null default 1
    constraint horarios_taller_bloque_check check (bloque between 1 and 4);

comment on column public.horarios_taller.bloque is
  'Bloque de apertura al que pertenece la hora (1 = mañana, 2 = tarde…). Lo usa la antelación por servicio: un bloque termina en su última hora reservable.';

-- Relleno inicial: las horas de tarde de Speedbikes (16-18) y Rik and Roll (15:30-18:30) pasan al bloque 2.
update public.horarios_taller set bloque = 2 where hora >= time '14:00';

-- ----------------------------------------------------------------------------
-- 2. Antelación por servicio
-- ----------------------------------------------------------------------------
alter table public.servicios_taller
  add column bloques_antelacion smallint not null default 0
    constraint servicios_taller_bloques_antelacion_check check (bloques_antelacion between 0 and 10),
  add column antelacion_texto text
    constraint servicios_taller_antelacion_texto_check check (antelacion_texto is null or char_length(antelacion_texto) between 1 and 200);

comment on column public.servicios_taller.bloques_antelacion is
  'Bloques de apertura (mañana/tarde) que el taller necesita entre la solicitud del cliente y la cita: la cita solo puede ser desde el bloque siguiente al enésimo. 0 = sin antelación. Neumáticos en Rik and Roll: 1.';
comment on column public.servicios_taller.antelacion_texto is
  'Explicación para el cliente en la pantalla de fecha y hora cuando el servicio tiene antelación (opcional; la web añade "Primera hora disponible: …").';

-- ----------------------------------------------------------------------------
-- 3. Primera hora reservable para un servicio
-- ----------------------------------------------------------------------------
-- Los bloques se numeran en orden (día, bloque) a partir del día de la solicitud, sin festivos. El
-- bloque en que el taller atiende la solicitud es el que está abierto en ese instante (entre su
-- primera y su última hora) o, con el taller cerrado, el siguiente que abre. La cita puede ser desde
-- la primera hora del bloque que va N bloques después.
create function public.antelacion_minima_en(p_taller_id bigint, p_servicio_id bigint, p_ahora timestamptz)
returns timestamp without time zone
language plpgsql
stable
set search_path = ''
as $$
declare
  v_bloques integer;
  v_ahora   timestamp := p_ahora at time zone 'Europe/Madrid';
  v_minimo  timestamp;
begin
  select s.bloques_antelacion into v_bloques
  from public.servicios_taller s
  where s.id = p_servicio_id and s.taller_id = p_taller_id and s.activo;
  if coalesce(v_bloques, 0) = 0 then
    return null;
  end if;

  with huecos as (
    -- Todas las horas reservables del taller en los próximos 100 días (más que los 90 que admite la web).
    select d::date as dia, h.bloque, d::date + h.hora as instante
    from generate_series(v_ahora::date, v_ahora::date + 100, interval '1 day') as d
    join public.horarios_taller h on h.taller_id = p_taller_id and h.dia_semana = extract(dow from d)::integer
    where not exists (select 1 from public.festivos_taller f where f.taller_id = p_taller_id and f.fecha = d::date)
  ),
  bloques as (
    -- Numerados por orden cronológico real (no por la etiqueta del bloque, por si un seed la invierte).
    select dia, bloque, min(instante) as inicio, max(instante) as fin, row_number() over (order by dia, min(instante)) as n
    from huecos
    group by dia, bloque
  ),
  pedido as (
    -- min() por si un seed dejara dos bloques solapados: nunca más de una fila.
    select coalesce(
      (select min(b.n) from bloques b where v_ahora between b.inicio and b.fin),
      (select min(b.n) from bloques b where b.inicio > v_ahora)
    ) as n
  )
  select b.inicio into v_minimo
  from bloques b
  join pedido p on b.n = p.n + v_bloques;

  -- Sin bloques suficientes en 100 días (taller cerrado): no se puede reservar nada.
  return coalesce(v_minimo, timestamp '9999-12-31 00:00');
end;
$$;

comment on function public.antelacion_minima_en(bigint, bigint, timestamptz) is
  'Primera hora reservable (hora del taller) para un servicio con antelación si la solicitud se hace en p_ahora; null si el servicio no tiene antelación. Interna: la usan validar_datos_reserva y antelacion_minima.';

create function public.antelacion_minima(p_taller_id bigint, p_servicio_id bigint)
returns timestamp without time zone
language sql
stable
security definer
set search_path = ''
as $$
  select public.antelacion_minima_en(t.id, p_servicio_id, now())
  from public.talleres t
  where t.id = p_taller_id and t.activo;
$$;

comment on function public.antelacion_minima(bigint, bigint) is
  'Web pública: primera hora reservable ahora mismo para un servicio con antelación (null si no la tiene o el taller no está activo). Sin datos personales.';

revoke all on function public.antelacion_minima_en(bigint, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.antelacion_minima(bigint, bigint) from public;
grant execute on function public.antelacion_minima(bigint, bigint) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. validar_datos_reserva: las solicitudes de clientes respetan la antelación (CT021)
-- ----------------------------------------------------------------------------
-- Misma firma y mismo cuerpo que hasta ahora (20260920200000_config_taller); solo se añade la
-- comprobación final, después de los datos extra, para que un formulario incompleto siga diciendo
-- CT008 y no CT021.
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

  if p_es_taller then
    if p_dia < v_hoy_madrid then
      raise exception 'La fecha ya ha pasado' using errcode = 'CT004';
    end if;
  else
    if not exists (
      select 1 from public.horarios_taller h
      where h.taller_id = p_taller_id and h.dia_semana = extract(dow from p_dia)::integer and h.hora = p_hora
    ) then
      raise exception 'El taller no atiende a esa hora' using errcode = 'CT002';
    end if;
    if ((p_dia + p_hora) at time zone 'Europe/Madrid') <= now() then
      raise exception 'Esa hora ya ha pasado' using errcode = 'CT004';
    end if;
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
    select c.clave, c.tipo, c.opciones, c.obligatorio
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
      if not (v_campo.opciones ? v_valor) then
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
  'Validación común de crear_reserva_publica e insertar_reserva_taller. Errores CT002-CT009, CT013 y, para clientes, CT021 (antelación del servicio).';

notify pgrst, 'reload schema';
