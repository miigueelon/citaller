-- Fase 4.1: cierre de permisos públicos. Se aplica DESPUÉS de desplegar el frontend nuevo en
-- producción: el antiguo (demo del 15-sep) leía y actualizaba `reservas` directamente por REST (ya
-- insertaba por RPC); el nuevo lo hace todo por RPC (`crear_reserva_publica`, `ocupacion_dia`, `consultar_cita_cliente`)
-- y por Edge Functions con service_role (`confirmar-reserva`, `cancelar-reserva`,
-- `crear-reserva-taller`, `cancelar-cita-cliente`). Ver docs/plan.md, fase 4.
--
-- Lo que se cierra:
--   1. anon deja de leer e insertar en `reservas` por REST (solo por las RPC).
--   2. authenticated deja de insertar y actualizar `reservas` por REST (solo por Edge Functions);
--      conserva el SELECT de sus propias reservas, que es lo que el panel lee.
--   3. Se retiran las columnas de la app antigua que ya no lee nadie.
--
-- Lo que se queda a propósito:
--   - `talleres.user_id` legible por authenticated: el panel comprueba la pertenencia filtrando por
--     esa columna, y la política de SELECT ya limita cada usuario a su propio taller.
--   - `reservas.kilometros`: `crear_reserva_publica` e `insertar_reserva_taller` aún la rellenan
--     desde `datos_extra`; se retira cuando esas funciones se recreen (cambio de hora, fase 5).

-- 1. anon: ni lee ni inserta reservas por REST. (Revocar a nivel de tabla retira también los
--    privilegios por columna.)
drop policy if exists "Permitir lectura reservas" on public.reservas;
drop policy if exists "cliente puede solicitar reserva" on public.reservas;
revoke select, insert, update, delete on public.reservas from anon;

-- 2. authenticated: el panel escribe solo por Edge Functions.
drop policy if exists "taller puede crear reservas de su propio taller" on public.reservas;
drop policy if exists "taller puede confirmar o cancelar sus reservas" on public.reservas;
revoke insert, update, delete on public.reservas from authenticated;

-- 3. Columnas de la app antigua. La vista pública exponía `capacidad_simultanea`: se recrea sin ella
--    (una vista no admite quitar columnas con `create or replace`).
drop view public.talleres_publicos;
create view public.talleres_publicos with (security_invoker = true) as
  select id, nombre, telefono, direccion, ciudad, horario_texto, valoracion, numero_resenas, slug,
         modo_capacidad, capacidad, texto_aviso_tarde, texto_confirmacion, whatsapp_modo
  from public.talleres
  where activo;
comment on view public.talleres_publicos is 'Datos públicos de los talleres activos (los que ve la web de reserva).';
-- La ACL por defecto del esquema daría INSERT/UPDATE/DELETE a anon y authenticated sobre la vista
-- nueva; se retira todo y se concede solo la lectura (como hizo la migración que la creó).
revoke all on public.talleres_publicos from public, anon, authenticated;
grant select on public.talleres_publicos to anon, authenticated;

alter table public.talleres
  drop column capacidad_simultanea,
  drop column whatsapp_activo,
  drop column calendar_provider,
  drop column calendar_id;

alter table public.reservas
  drop column calendar_event_id,
  drop column calendar_provider,
  drop column calendar_sync_status;
