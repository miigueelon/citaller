-- ============================================================================
-- PLANTILLA de seed de un taller. Copiar la carpeta a clientes/<slug>/, sustituir TODO lo que
-- está entre << >> y borrar este encabezado. Idempotente: se puede aplicar tantas veces como
-- haga falta con `npx supabase db push --include-seed`.
-- Sin secretos: ni tokens, ni refresh_token, ni IDs de WhatsApp (esos van en Supabase Secrets/Vault
-- y en talleres.whatsapp_phone_number_id desde el dashboard).
-- ============================================================================

-- 1. Taller
insert into public.talleres (nombre, slug, telefono, direccion, ciudad, activo, capacidad_simultanea, horario_texto)
select '<<Nombre del taller>>', '<<slug>>', '<<600000000>>', '<<Dirección>>', '<<Ciudad>>', true, 1, '<<Lunes a viernes, 9:00 a 18:00>>'
where not exists (select 1 from public.talleres where slug = '<<slug>>');

update public.talleres
set modo_capacidad    = 'por_hora',          -- 'por_hora' (elevadores a la vez) o 'por_dia' (citas al día)
    capacidad         = 1,
    texto_aviso_tarde = null,                -- texto bajo la última hora del día, o null
    whatsapp_modo     = 'ninguno'            -- 'api', 'enlace' o 'ninguno'
where slug = '<<slug>>';

-- 2. Horario: día de la semana (1 lunes … 5 viernes, 6 sábado, 0 domingo) y horas.
insert into public.horarios_taller (taller_id, dia_semana, hora, aviso_tarde)
select t.id, d.dia_semana, h.hora, false
from public.talleres t
cross join (values (1), (2), (3), (4), (5)) as d(dia_semana)
cross join (values (time '09:00'), (time '10:00'), (time '11:00'), (time '12:00'), (time '16:00'), (time '17:00')) as h(hora)
where t.slug = '<<slug>>'
on conflict (taller_id, dia_semana, hora) do nothing;

-- 3. Servicios, en el orden del desplegable. descripcion_modo: oculta | opcional | obligatoria.
insert into public.servicios_taller (taller_id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda)
select t.id, s.nombre, s.orden, s.modo, s.etiqueta, s.placeholder, s.ayuda
from public.talleres t
cross join (values
  ('Revisión / mantenimiento', 1, 'oculta',   null, null, null),
  ('Cambio de aceite y filtros', 2, 'oculta', null, null, null),
  ('Frenos', 3, 'oculta', null, null, null),
  ('Neumáticos', 4, 'oculta', null, null, null),
  ('ITV', 5, 'oculta', null, null, null),
  ('Avería / luz de aviso', 6, 'opcional', 'Cuéntanos qué ocurre', 'Ej.: Se ha encendido una luz amarilla en el cuadro...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.'),
  ('Otro', 7, 'opcional', 'Cuéntanos qué necesitas', 'Ej.: Quiero revisar el aire acondicionado...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.')
) as s(nombre, orden, modo, etiqueta, placeholder, ayuda)
where t.slug = '<<slug>>'
on conflict (taller_id, nombre) do update
  set orden = excluded.orden, descripcion_modo = excluded.descripcion_modo, descripcion_etiqueta = excluded.descripcion_etiqueta,
      descripcion_placeholder = excluded.descripcion_placeholder, descripcion_ayuda = excluded.descripcion_ayuda;

-- 4. Campos extra (opcional). Ejemplo: un número para todos los servicios.
-- insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, obligatorio, orden, unidad)
-- select t.id, null, 'kilometros', 'Kilómetros (opcional)', 'numero', false, 1, 'km'
-- from public.talleres t where t.slug = '<<slug>>'
-- on conflict (taller_id, servicio_id, clave) do update set etiqueta = excluded.etiqueta, tipo = excluded.tipo, obligatorio = excluded.obligatorio, orden = excluded.orden, unidad = excluded.unidad;

-- 5. Festivos (opcional).
-- insert into public.festivos_taller (taller_id, fecha, nombre)
-- select t.id, f.fecha, f.nombre from public.talleres t cross join (values (date '2026-12-25', 'Navidad')) as f(fecha, nombre)
-- where t.slug = '<<slug>>' on conflict (taller_id, fecha) do nothing;
