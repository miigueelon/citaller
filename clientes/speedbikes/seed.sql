-- ============================================================================
-- Speed Bikes (antes "Speedbikes Moto"): taller de motos. Capacidad por día (6 citas), pide kilómetros, WhatsApp en
-- modo enlace (la dueña envía desde su número personal). Idempotente. Sin secretos.
-- El taller, sus horarios y festivos ya existían en la base de datos; aquí solo se declara la
-- configuración que antes estaba escrita en el código.
-- ============================================================================

update public.talleres
set modo_capacidad = 'por_dia',
    capacidad      = 6,
    max_citas_dia  = null,
    whatsapp_modo  = 'enlace'
where slug = 'speedbikes';

insert into public.servicios_taller (taller_id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda)
select t.id, s.nombre, s.orden, s.modo, s.etiqueta, s.placeholder, s.ayuda
from public.talleres t
cross join (values
  ('Revisión / mantenimiento', 1, 'oculta', null, null, null),
  ('Cambio de aceite y filtros', 2, 'oculta', null, null, null),
  ('Frenos', 3, 'oculta', null, null, null),
  ('Neumáticos', 4, 'oculta', null, null, null),
  ('ITV', 5, 'oculta', null, null, null),
  ('Avería / luz de aviso', 6, 'opcional', 'Cuéntanos qué ocurre', 'Ej.: Se ha encendido una luz amarilla en el cuadro...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.'),
  ('Otro', 7, 'opcional', 'Cuéntanos qué necesitas', 'Ej.: Quiero revisar el aire acondicionado...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.')
) as s(nombre, orden, modo, etiqueta, placeholder, ayuda)
where t.slug = 'speedbikes'
on conflict (taller_id, nombre) do update
  set orden = excluded.orden, descripcion_modo = excluded.descripcion_modo, descripcion_etiqueta = excluded.descripcion_etiqueta,
      descripcion_placeholder = excluded.descripcion_placeholder, descripcion_ayuda = excluded.descripcion_ayuda;

-- Kilómetros de la moto, opcional, para todos los servicios.
insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, obligatorio, orden, unidad)
select t.id, null, 'kilometros', 'Kilómetros (opcional)', 'numero', false, 1, 'km'
from public.talleres t
where t.slug = 'speedbikes'
on conflict (taller_id, servicio_id, clave) do update
  set etiqueta = excluded.etiqueta, tipo = excluded.tipo, obligatorio = excluded.obligatorio, orden = excluded.orden, unidad = excluded.unidad;

-- Enlaza las reservas existentes con su servicio.
update public.reservas r
set servicio_id = s.id
from public.servicios_taller s, public.talleres t
where t.slug = 'speedbikes' and r.taller_id = t.id and s.taller_id = t.id and s.nombre = r.servicio and r.servicio_id is null;

-- Festivos de 2027: los 12 del calendario oficial de Cataluña (treball.gencat.cat). Los de 2026 ya
-- estaban en la base de datos. Faltan los 2 locales de Castelldefels de 2027: se añaden aquí cuando
-- el Ayuntamiento los publique (en 2026 fueron el 14 de agosto y el 7 de diciembre).
insert into public.festivos_taller (taller_id, fecha, nombre)
select t.id, f.fecha, f.nombre
from public.talleres t
cross join (values
  (date '2027-01-01', 'Año Nuevo'),
  (date '2027-01-06', 'Reyes'),
  (date '2027-03-26', 'Viernes Santo'),
  (date '2027-03-29', 'Lunes de Pascua'),
  (date '2027-05-01', 'Fiesta del Trabajo'),
  (date '2027-06-24', 'San Juan'),
  (date '2027-09-11', 'Diada Nacional de Catalunya'),
  (date '2027-10-12', 'Fiesta Nacional de España'),
  (date '2027-11-01', 'Todos los Santos'),
  (date '2027-12-06', 'Día de la Constitución'),
  (date '2027-12-08', 'Inmaculada'),
  (date '2027-12-25', 'Navidad')
) as f(fecha, nombre)
where t.slug = 'speedbikes'
on conflict (taller_id, fecha) do nothing;

-- Mensajes de WhatsApp (modo enlace). Pedido de Miguel del 24-sep-2026: en confirmación,
-- recordatorio y "vehículo listo" el taller firma como SPEED BIKES, en mayúsculas (la web dice
-- "Speed Bikes"). La cancelación usa el texto por defecto con {taller}. En "listo" se habla de "moto".
update public.talleres
set texto_whatsapp_confirmacion = 'Hola {nombre}, te escribimos de SPEED BIKES. Tu cita está confirmada para el {dia} a las {hora}: {servicio} ({vehiculo}, {matricula}). Si no puedes venir, puedes cancelarla hasta 24 horas antes desde este enlace: {enlace_cita}. ¡Gracias!',
    texto_whatsapp_recordatorio = 'Hola {nombre}, te recordamos tu cita en SPEED BIKES mañana, {dia}, a las {hora}: {servicio} ({vehiculo}). ¡Te esperamos!',
    texto_whatsapp_listo        = 'Hola {nombre}, te escribimos de SPEED BIKES. Tu moto ({vehiculo}, {matricula}) ya está lista: puedes pasar a recogerla cuando quieras. ¡Gracias!'
where slug = 'speedbikes';
