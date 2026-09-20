-- ============================================================================
-- Speedbikes Moto: taller de motos. Capacidad por día (6 citas), pide kilómetros, WhatsApp en
-- modo enlace (la dueña envía desde su número personal). Idempotente. Sin secretos.
-- El taller, sus horarios y festivos ya existían en la base de datos; aquí solo se declara la
-- configuración que antes estaba escrita en el código.
-- ============================================================================

update public.talleres
set modo_capacidad = 'por_dia',
    capacidad      = 6,
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
