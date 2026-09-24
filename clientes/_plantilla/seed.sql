-- ============================================================================
-- PLANTILLA de seed de un taller. Copiar la carpeta a clientes/<slug>/, sustituir TODO lo que
-- está entre << >> y borrar este encabezado. Idempotente: se puede aplicar tantas veces como
-- haga falta con `npx supabase db push --include-seed`.
-- Sin secretos: ni tokens, ni refresh_token, ni IDs de WhatsApp (esos van en Supabase Secrets/Vault
-- y en talleres.whatsapp_phone_number_id desde el dashboard).
-- ============================================================================

-- 1. Taller
insert into public.talleres (nombre, slug, telefono, direccion, ciudad, activo, horario_texto)
select '<<Nombre del taller>>', '<<slug>>', '<<600000000>>', '<<Dirección>>', '<<Ciudad>>', true, '<<Lunes a viernes, 9:00 a 18:00>>'
where not exists (select 1 from public.talleres where slug = '<<slug>>');

update public.talleres
set modo_capacidad    = 'por_hora',          -- 'por_hora' (elevadores a la vez) o 'por_dia' (citas al día)
    capacidad         = 1,
    max_citas_dia     = null,                -- tope de citas en todo el día además del anterior, o null
    texto_aviso_tarde = null,                -- texto bajo la última hora del día, o null
    whatsapp_modo     = 'ninguno'            -- 'api', 'enlace' o 'ninguno'
where slug = '<<slug>>';

-- 2. Horario: día de la semana (1 lunes … 5 viernes, 6 sábado, 0 domingo), horas y bloque de
--    apertura de cada hora (1 = mañana, 2 = tarde). El bloque solo importa para los servicios con
--    antelación (punto 3): un bloque termina en su última hora reservable.
insert into public.horarios_taller (taller_id, dia_semana, hora, aviso_tarde, bloque)
select t.id, d.dia_semana, h.hora, false, h.bloque
from public.talleres t
cross join (values (1), (2), (3), (4), (5)) as d(dia_semana)
cross join (values (time '09:00', 1), (time '10:00', 1), (time '11:00', 1), (time '12:00', 1), (time '16:00', 2), (time '17:00', 2)) as h(hora, bloque)
where t.slug = '<<slug>>'
on conflict (taller_id, dia_semana, hora) do update set bloque = excluded.bloque;

-- 3. Servicios, en el orden del desplegable. descripcion_modo: oculta | opcional | obligatoria.
--    bloques_antelacion: bloques de apertura enteros que el taller necesita entre la solicitud y la
--    cita (0 = ninguno; 1 = "medio día para recibir el material", como Neumáticos en Rik and Roll).
--    antelacion_texto: lo que la web explica al cliente junto a la primera hora posible (o null).
insert into public.servicios_taller (taller_id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda, bloques_antelacion, antelacion_texto)
select t.id, s.nombre, s.orden, s.modo, s.etiqueta, s.placeholder, s.ayuda, s.bloques, s.antelacion
from public.talleres t
cross join (values
  ('Revisión / mantenimiento', 1, 'oculta',   null, null, null, 0, null),
  ('Cambio de aceite y filtros', 2, 'oculta', null, null, null, 0, null),
  ('Frenos', 3, 'oculta', null, null, null, 0, null),
  ('Neumáticos', 4, 'oculta', null, null, null, 0, null),  -- con antelación: 1, 'Los neumáticos se piden al proveedor: necesitamos medio día para tenerlos en el taller.'
  ('ITV', 5, 'oculta', null, null, null, 0, null),
  ('Avería / luz de aviso', 6, 'opcional', 'Cuéntanos qué ocurre', 'Ej.: Se ha encendido una luz amarilla en el cuadro...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.', 0, null),
  ('Otro', 7, 'opcional', 'Cuéntanos qué necesitas', 'Ej.: Quiero revisar el aire acondicionado...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.', 0, null)
) as s(nombre, orden, modo, etiqueta, placeholder, ayuda, bloques, antelacion)
where t.slug = '<<slug>>'
on conflict (taller_id, nombre) do update
  set orden = excluded.orden, descripcion_modo = excluded.descripcion_modo, descripcion_etiqueta = excluded.descripcion_etiqueta,
      descripcion_placeholder = excluded.descripcion_placeholder, descripcion_ayuda = excluded.descripcion_ayuda,
      bloques_antelacion = excluded.bloques_antelacion, antelacion_texto = excluded.antelacion_texto;

-- 4. Campos extra (opcional). Ejemplo: un número para todos los servicios. Un desplegable (tipo
--    'select') lleva `opciones` (lo que ve el cliente) y, si el mostrador puede elegir más, `opciones_panel`
--    (ver clientes/rikandroll: Neumáticos 2 o 4 al público, 1 a 4 en el panel).
--    Si el taller quiere que "Nueva cita" exija teléfono, nombre con apellido y descripción:
--    `mostrador_datos_obligatorios = true` en el update de talleres del punto 1.
-- insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, obligatorio, orden, unidad)
-- select t.id, null, 'kilometros', 'Kilómetros (opcional)', 'numero', false, 1, 'km'
-- from public.talleres t where t.slug = '<<slug>>'
-- on conflict (taller_id, servicio_id, clave) do update set etiqueta = excluded.etiqueta, tipo = excluded.tipo, obligatorio = excluded.obligatorio, orden = excluded.orden, unidad = excluded.unidad;

-- 5. Festivos (opcional).
-- insert into public.festivos_taller (taller_id, fecha, nombre)
-- select t.id, f.fecha, f.nombre from public.talleres t cross join (values (date '2026-12-25', 'Navidad')) as f(fecha, nombre)
-- where t.slug = '<<slug>>' on conflict (taller_id, fecha) do nothing;

-- 6. Mecánicos que apuntan citas a mano (opcional). NO van aquí los nombres reales (son datos
--    personales): se cargan en la base de datos con el SQL de docs/operaciones.md. Si el taller no
--    tiene ninguno, el panel no pregunta quién apunta la cita.
