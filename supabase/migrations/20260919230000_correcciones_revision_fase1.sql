-- ============================================================================
-- FASE 1: correcciones de la revisión independiente de las migraciones anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. El trigger de capacidad pasa a SECURITY DEFINER.
--
-- Era SECURITY INVOKER y su recuento hace `id <> coalesce(new.id, 0)`, pero anon no tiene
-- SELECT sobre reservas.id (solo taller_id, dia, hora, estado). Resultado: cualquier INSERT
-- directo de anon en el taller 1 fallaba con "permission denied for table reservas" desde que
-- se pusieron los grants por columna. Es la ruta que usa el frontend de producción
-- (commit del 15-sep), así que las reservas de Speedbikes estaban rotas ahí; con la RPC
-- crear_reserva_publica (SECURITY DEFINER) sí funcionaban.
-- Un límite de capacidad debe contar todas las reservas del taller, no solo las que ve quien
-- inserta, así que DEFINER es además lo correcto.
-- ----------------------------------------------------------------------------
alter function public.comprobar_limite_citas_dia() security definer;

-- ----------------------------------------------------------------------------
-- 2. La vista talleres_publicos necesita que anon pueda leer talleres.activo.
--
-- Con security_invoker, Postgres comprueba los privilegios de quien consulta sobre TODAS las
-- columnas que la vista usa, incluidas las del WHERE. Sin este grant la vista devolvía
-- "permission denied for table talleres" a la página pública de reservas.
-- ----------------------------------------------------------------------------
grant select (activo) on public.talleres to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Un taller desactivado tampoco se ve leyendo la tabla directamente.
--
-- La vista filtra `activo`, pero anon conserva (hasta el despliegue del frontend nuevo) los
-- grants por columna sobre `talleres`, así que podía saltarse la vista. Con la política por
-- filas, un taller con activo=false deja de ser visible para el público por cualquier camino.
-- ----------------------------------------------------------------------------
drop policy if exists "Permitir lectura publica talleres" on public.talleres;
create policy "lectura publica de talleres activos" on public.talleres
  for select to anon
  using (activo);
