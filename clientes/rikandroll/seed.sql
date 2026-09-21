-- ============================================================================
-- Rik and Roll: taller de coches. Capacidad por hora (2 a la vez); en Neumáticos pide cantidad y
-- medidas con imagen de ayuda. WhatsApp: 'ninguno' hasta que exista su cuenta de Meta Business
-- (entonces pasa a 'api' y se rellena whatsapp_phone_number_id desde el dashboard).
-- Idempotente. Sin secretos.
-- ============================================================================

update public.talleres
set modo_capacidad = 'por_hora',
    capacidad      = 2,
    whatsapp_modo  = case when whatsapp_modo = 'api' then 'api' else 'enlace' end
where slug = 'rikandroll';

insert into public.servicios_taller (taller_id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda, imagen_ayuda_url)
select t.id, s.nombre, s.orden, s.modo, s.etiqueta, s.placeholder, s.ayuda, s.imagen
from public.talleres t
cross join (values
  ('Revisión / mantenimiento', 1, 'oculta', null, null, null, null),
  ('Cambio de aceite y filtros', 2, 'oculta', null, null, null, null),
  ('Frenos', 3, 'oculta', null, null, null, null),
  ('Neumáticos', 4, 'obligatoria', 'Medidas / observaciones', 'Ej.: 225/45 R17 91Y', 'ⓘ Indica la medida que aparece en el lateral del neumático.', '/clientes/rikandroll/guia_neumatico.png'),
  ('ITV', 5, 'oculta', null, null, null, null),
  ('Avería / luz de aviso', 6, 'opcional', 'Cuéntanos qué ocurre', 'Ej.: Se ha encendido una luz amarilla en el cuadro...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.', null),
  ('Otro', 7, 'opcional', 'Cuéntanos qué necesitas', 'Ej.: Quiero revisar el aire acondicionado...', 'ⓘ Cuanta más información nos des, mejor podremos ayudarte.', null)
) as s(nombre, orden, modo, etiqueta, placeholder, ayuda, imagen)
where t.slug = 'rikandroll'
on conflict (taller_id, nombre) do update
  set orden = excluded.orden, descripcion_modo = excluded.descripcion_modo, descripcion_etiqueta = excluded.descripcion_etiqueta,
      descripcion_placeholder = excluded.descripcion_placeholder, descripcion_ayuda = excluded.descripcion_ayuda, imagen_ayuda_url = excluded.imagen_ayuda_url;

-- Cantidad de neumáticos, obligatoria, solo en el servicio Neumáticos.
insert into public.campos_formulario_taller (taller_id, servicio_id, clave, etiqueta, tipo, opciones, obligatorio, orden)
select t.id, s.id, 'cantidad_neumaticos', '¿Cuántos neumáticos quieres cambiar?', 'select', '["1", "2", "3", "4"]'::jsonb, true, 1
from public.talleres t
join public.servicios_taller s on s.taller_id = t.id and s.nombre = 'Neumáticos'
where t.slug = 'rikandroll'
on conflict (taller_id, servicio_id, clave) do update
  set etiqueta = excluded.etiqueta, tipo = excluded.tipo, opciones = excluded.opciones, obligatorio = excluded.obligatorio, orden = excluded.orden;

update public.reservas r
set servicio_id = s.id
from public.servicios_taller s, public.talleres t
where t.slug = 'rikandroll' and r.taller_id = t.id and s.taller_id = t.id and s.nombre = r.servicio and r.servicio_id is null;
