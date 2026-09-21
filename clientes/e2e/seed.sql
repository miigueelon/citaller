-- ============================================================================
-- Taller de pruebas `e2e`. Es el único taller cuyos datos se pueden crear, cambiar y borrar
-- (ver CLAUDE.md). Sirve para verificar la cadena completa sin tocar Speedbikes ni Rik and Roll,
-- y es el taller que usan Playwright y `npm run probar-cadena`.
--
-- Idempotente. Se aplica con `npx supabase db push --include-seed`.
-- No contiene secretos: la contraseña del usuario de pruebas vive en `.env.local`
-- (`E2E_TALLER_PASSWORD`), y el usuario se crea con la API de administración de Supabase Auth.
-- ============================================================================

insert into public.talleres
  (nombre, slug, telefono, direccion, ciudad, activo, horario_texto)
select
  'Taller de pruebas e2e', 'e2e', '600000000', 'Calle de Prueba 1', 'Pruebas', true,
  'Lunes a viernes, 9:00 a 13:00'
where not exists (select 1 from public.talleres where slug = 'e2e');

-- Tope de 7 al día: probar-cadena llega a 5 activas en su día principal, así que queda margen, y
-- con 4 horas × 2 caben 8, de modo que la octava de un día comprueba el tope diario.
update public.talleres
set slug           = 'e2e',
    modo_capacidad = 'por_hora',
    capacidad      = 2,
    max_citas_dia  = 7,
    whatsapp_modo  = 'ninguno'
where nombre = 'Taller de pruebas e2e';

-- Dos mecánicos ficticios, para probar "¿Quién la apunta?" en las citas a mano.
insert into public.miembros_taller (taller_id, nombre, orden)
select t.id, m.nombre, m.orden
from public.talleres t
cross join (values ('Mecánico A', 1), ('Mecánico B', 2)) as m(nombre, orden)
where t.slug = 'e2e'
on conflict (taller_id, nombre) do update set orden = excluded.orden, activo = true;

-- Horario: de lunes a viernes, a las 9, 10, 11 y 12. La última hora lleva aviso de tarde
-- para poder comprobar ese aviso en la pantalla de reserva.
insert into public.horarios_taller (taller_id, dia_semana, hora, aviso_tarde)
select t.id, d.dia_semana, h.hora, (h.hora = time '12:00')
from public.talleres t
cross join (values (1), (2), (3), (4), (5)) as d(dia_semana)
cross join (values (time '09:00'), (time '10:00'), (time '11:00'), (time '12:00')) as h(hora)
where t.slug = 'e2e'
on conflict (taller_id, dia_semana, hora) do nothing;

-- Un festivo fijo para comprobar que el calendario lo deshabilita.
insert into public.festivos_taller (taller_id, fecha, nombre)
select t.id, date '2026-12-25', 'Navidad (prueba)'
from public.talleres t
where t.slug = 'e2e'
on conflict (taller_id, fecha) do nothing;

-- Servicios: los siete habituales; "Neumáticos" con descripción obligatoria y "Otro" opcional,
-- para probar las tres variantes de descripción.
insert into public.servicios_taller (taller_id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda)
select t.id, s.nombre, s.orden, s.modo, s.etiqueta, s.placeholder, s.ayuda
from public.talleres t
cross join (values
  ('Revisión / mantenimiento', 1, 'oculta', null, null, null),
  ('Cambio de aceite y filtros', 2, 'oculta', null, null, null),
  ('Frenos', 3, 'oculta', null, null, null),
  ('Neumáticos', 4, 'obligatoria', 'Medidas / observaciones', 'Ej.: 225/45 R17 91Y', 'ⓘ Indica la medida que aparece en el lateral del neumático.'),
  ('ITV', 5, 'oculta', null, null, null),
  ('Avería / luz de aviso', 6, 'opcional', 'Cuéntanos qué ocurre', 'Ej.: Se ha encendido una luz amarilla en el cuadro...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.'),
  ('Otro', 7, 'opcional', 'Cuéntanos qué necesitas', 'Ej.: Quiero revisar el aire acondicionado...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.')
) as s(nombre, orden, modo, etiqueta, placeholder, ayuda)
where t.slug = 'e2e'
on conflict (taller_id, nombre) do update
  set orden = excluded.orden, descripcion_modo = excluded.descripcion_modo, descripcion_etiqueta = excluded.descripcion_etiqueta,
      descripcion_placeholder = excluded.descripcion_placeholder, descripcion_ayuda = excluded.descripcion_ayuda;

-- Campos extra: un número opcional para todos y un select obligatorio solo en Neumáticos.
insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, obligatorio, orden, unidad)
select t.id, null, 'kilometros', 'Kilómetros (opcional)', 'numero', false, 1, 'km'
from public.talleres t
where t.slug = 'e2e'
on conflict (taller_id, servicio_id, clave) do update
  set etiqueta = excluded.etiqueta, tipo = excluded.tipo, obligatorio = excluded.obligatorio, orden = excluded.orden, unidad = excluded.unidad;

insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, opciones, obligatorio, orden)
select t.id, s.id, 'cantidad_neumaticos', '¿Cuántos neumáticos quieres cambiar?', 'select', '["1", "2", "3", "4"]'::jsonb, true, 1
from public.talleres t
join public.servicios_taller s on s.taller_id = t.id and s.nombre = 'Neumáticos'
where t.slug = 'e2e'
on conflict (taller_id, servicio_id, clave) do update
  set etiqueta = excluded.etiqueta, tipo = excluded.tipo, opciones = excluded.opciones, obligatorio = excluded.obligatorio, orden = excluded.orden;

-- Dueño del taller de pruebas, si el usuario ya existe en Auth.
update public.talleres t
set user_id = u.id
from auth.users u
where t.slug = 'e2e'
  and u.email = 'taller.e2e@citaller.test'
  and t.user_id is distinct from u.id;
