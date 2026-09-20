-- ============================================================================
-- Taller de pruebas `e2e`. Es el único taller cuyos datos se pueden crear, cambiar y borrar
-- (ver CLAUDE.md). Sirve para verificar la cadena completa sin tocar Speedbikes ni Rik and Roll,
-- y es el taller que usarán las pruebas de Playwright desde la fase 2.
--
-- Idempotente: se puede aplicar tantas veces como se quiera.
-- Se aplica con `npx supabase db push --include-seed` (declarado en supabase/config.toml).
-- No contiene secretos: la contraseña del usuario de pruebas vive en `.env.local`
-- (`E2E_TALLER_PASSWORD`), y el usuario se crea con la API de administración de Supabase Auth.
-- ============================================================================

insert into public.talleres
  (nombre, telefono, direccion, ciudad, activo, capacidad_simultanea, horario_texto)
select
  'Taller de pruebas e2e', '600000000', 'Calle de Prueba 1', 'Pruebas', true, 2,
  'Lunes a viernes, 9:00 a 13:00'
where not exists (select 1 from public.talleres where nombre = 'Taller de pruebas e2e');

-- Horario: de lunes a viernes, a las 9, 10, 11 y 12. La última hora lleva aviso de tarde
-- para poder comprobar ese aviso en la pantalla de reserva.
insert into public.horarios_taller (taller_id, dia_semana, hora, aviso_tarde)
select t.id, d.dia_semana, h.hora, (h.hora = time '12:00')
from public.talleres t
cross join (values (1), (2), (3), (4), (5)) as d(dia_semana)
cross join (values (time '09:00'), (time '10:00'), (time '11:00'), (time '12:00')) as h(hora)
where t.nombre = 'Taller de pruebas e2e'
on conflict (taller_id, dia_semana, hora) do nothing;

-- Un festivo fijo para comprobar que el calendario lo deshabilita.
insert into public.festivos_taller (taller_id, fecha, nombre)
select t.id, date '2026-12-25', 'Navidad (prueba)'
from public.talleres t
where t.nombre = 'Taller de pruebas e2e'
on conflict (taller_id, fecha) do nothing;

-- Dueño del taller de pruebas, si el usuario ya existe en Auth.
update public.talleres t
set user_id = u.id
from auth.users u
where t.nombre = 'Taller de pruebas e2e'
  and u.email = 'taller.e2e@citaller.test'
  and t.user_id is distinct from u.id;
