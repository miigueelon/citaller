-- Pedidos de Miguel en Rik and Roll (24-sep-2026), para "Nueva cita" del panel (el mostrador):
--   1. Que todos los datos sean obligatorios: teléfono, nombre con primer apellido y la descripción
--      cuando el servicio la tiene (aunque para el público sea opcional). Es una decisión de cada
--      taller: `talleres.mostrador_datos_obligatorios` (Rik and Roll sí; los demás como estaban).
--   2. Que en Neumáticos el mecánico pueda elegir 1, 2, 3 o 4, aunque al cliente solo se le
--      ofrezcan 2 o 4: `campos_formulario_taller.opciones_panel` (null = las mismas que el público).
-- Compatible hacia atrás: con el valor por defecto (false / null) nada cambia.
-- Códigos nuevos: CT022 (falta el teléfono) y CT023 (falta el primer apellido).

-- 1. Datos obligatorios en el mostrador, por taller. Solo lo lee el panel del taller
--    (authenticated tiene SELECT de tabla en talleres; anon solo columnas concretas, esta no).
alter table public.talleres
  add column mostrador_datos_obligatorios boolean not null default false;

comment on column public.talleres.mostrador_datos_obligatorios is 'Cita a mano desde el panel: si es true, exige teléfono, nombre con primer apellido y descripción cuando el servicio la tiene (CT022, CT023, CT008). Los campos extra siguen su propio "obligatorio".';

-- 2. Opciones de un desplegable solo para el panel.
alter table public.campos_formulario_taller
  add column opciones_panel jsonb,
  add constraint campos_formulario_taller_opciones_panel_check check (opciones_panel is null or jsonb_typeof(opciones_panel) = 'array');

comment on column public.campos_formulario_taller.opciones_panel is 'Opciones del desplegable cuando la cita la apunta el taller. Null = las mismas que el público (opciones). Solo para tipo select.';

-- 3. Validación común: en las citas del taller, un select acepta las opciones del panel si las hay.
--    Misma firma; solo cambia el bloque del select (y la lectura de opciones_panel).
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
  'Validación común de crear_reserva_publica e insertar_reserva_taller. Errores CT002-CT009, CT013 y, para clientes, CT021 (antelación del servicio). En las citas del taller un select acepta opciones_panel si existe.';

-- 4. Cita a mano: si el taller exige los datos completos, teléfono, apellido y descripción.
--    Misma firma que en 20260921180100_miembros_taller: se conservan permisos (solo service_role).
create or replace function public.insertar_reserva_taller(
  p_taller_id   bigint,
  p_matricula   text,
  p_nombre      text,
  p_telefono    text,
  p_vehiculo    text,
  p_servicio    text,
  p_descripcion text,
  p_dia         date,
  p_hora        time without time zone,
  p_datos_extra jsonb default '{}'::jsonb,
  p_miembro_id  bigint default null
)
returns table (reserva_id bigint, token_publico uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v        record;
  v_id     bigint;
  v_token  uuid;
  v_exigir boolean;
begin
  if coalesce(btrim(p_nombre), '') = '' or coalesce(btrim(p_vehiculo), '') = '' then
    raise exception 'Faltan el nombre o el vehículo' using errcode = 'CT008';
  end if;

  -- Si el taller tiene miembros activos, hay que decir cuál apunta la cita, y tiene que ser suyo.
  if p_miembro_id is not null then
    if not exists (
      select 1 from public.miembros_taller m
      where m.id = p_miembro_id and m.taller_id = p_taller_id and m.activo
    ) then
      raise exception 'Ese miembro no es del taller o está de baja' using errcode = 'CT017';
    end if;
  elsif exists (select 1 from public.miembros_taller m where m.taller_id = p_taller_id and m.activo) then
    raise exception 'Falta quién apunta la cita' using errcode = 'CT017';
  end if;

  select * into v from public.validar_datos_reserva(p_taller_id, p_servicio, p_descripcion, p_dia, p_hora, p_telefono, p_matricula, p_datos_extra, true);

  -- Datos completos en el mostrador (24-sep-2026), si el taller lo pide. El panel avisa antes de
  -- llegar aquí; esto es la garantía.
  select t.mostrador_datos_obligatorios into v_exigir from public.talleres t where t.id = p_taller_id;
  if coalesce(v_exigir, false) then
    if v.telefono is null then
      raise exception 'En este taller la cita del mostrador necesita el teléfono del cliente' using errcode = 'CT022';
    end if;
    if btrim(p_nombre) !~ '\S\s+\S' then
      raise exception 'Escribe el nombre y el primer apellido del cliente' using errcode = 'CT023';
    end if;
    if v.descripcion is null and exists (
      select 1 from public.servicios_taller s where s.id = v.servicio_id and s.descripcion_modo = 'opcional'
    ) then
      raise exception 'Este servicio necesita una descripción' using errcode = 'CT008';
    end if;
  end if;

  insert into public.reservas
    (taller_id, matricula, nombre, telefono, vehiculo, servicio, servicio_id, descripcion, dia, hora, estado, datos_extra, kilometros, creada_por, creada_por_miembro)
  values
    (p_taller_id, v.matricula, left(btrim(p_nombre), 120), v.telefono, left(btrim(p_vehiculo), 120), p_servicio, v.servicio_id, v.descripcion, p_dia, p_hora, 'Confirmada', v.datos_extra,
     nullif(v.datos_extra ->> 'kilometros', '')::integer, 'taller', p_miembro_id)
  returning id, reservas.token_publico into v_id, v_token;

  return query select v_id, v_token;
end;
$$;
comment on function public.insertar_reserva_taller(bigint, text, text, text, text, text, text, date, time without time zone, jsonb, bigint) is
  'Cita apuntada a mano desde el panel (solo service_role, vía crear-reserva-taller). Nace Confirmada. CT017 quién la apunta; con mostrador_datos_obligatorios, CT022 teléfono, CT023 apellido y CT008 descripción.';

notify pgrst, 'reload schema';
