-- ============================================================================
-- FASE 1.1 y 1.4 (docs/plan.md): integridad de reservas, superficie pública y endurecimiento.
--
-- Compatibilidad: el frontend que hoy está en producción (commit del 15-sep, demo de un solo
-- taller) inserta directamente en `reservas` como anon (taller_id = 1, estado 'Pendiente') y lee
-- (dia, hora, estado) de `reservas`. Esta migración NO toca esos permisos: el INSERT directo y
-- el SELECT por columnas de anon en `reservas` se revocan en la migración que acompañe al
-- despliegue del frontend nuevo (ver docs/plan.md, "Pendiente del despliegue").
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Integridad de reservas (verificado antes: 0 huérfanas, 0 nulos, estados solo
--    'Confirmada' y 'Cancelada').
-- ----------------------------------------------------------------------------
alter table public.reservas
  alter column taller_id set not null,
  alter column dia       set not null,
  alter column hora      set not null,
  alter column estado    set not null;

alter table public.reservas
  add constraint reservas_taller_id_fkey
    foreign key (taller_id) references public.talleres (id) on delete restrict;

alter table public.reservas
  add constraint reservas_estado_check
    check (estado in ('Pendiente', 'Confirmada', 'Cancelada'));

-- Cubre la clave foránea y las consultas de ocupación por día.
create index if not exists reservas_taller_dia_idx on public.reservas (taller_id, dia);

-- ----------------------------------------------------------------------------
-- 2. Superficie pública: vista de talleres y ocupación agregada.
-- ----------------------------------------------------------------------------

-- security_invoker: se aplican los grants por columna y la RLS del que consulta (anon).
create view public.talleres_publicos
  with (security_invoker = true) as
  select id, nombre, telefono, direccion, ciudad, capacidad_simultanea,
         horario_texto, valoracion, numero_resenas
  from public.talleres
  where activo;

revoke all on public.talleres_publicos from public, anon, authenticated;
grant select on public.talleres_publicos to anon, authenticated;

-- Número de reservas activas por hora de un día. Solo devuelve recuentos, nunca datos
-- personales. SECURITY DEFINER para que siga funcionando cuando se retire a anon el
-- SELECT sobre `reservas`.
create function public.ocupacion_dia(p_taller_id bigint, p_dia date)
returns table (hora time without time zone, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.hora, count(*)::integer
  from public.reservas r
  join public.talleres t on t.id = r.taller_id and t.activo
  where r.taller_id = p_taller_id
    and r.dia = p_dia
    and r.estado in ('Pendiente', 'Confirmada')
  group by r.hora
  order by r.hora;
$$;

revoke all on function public.ocupacion_dia(bigint, date) from public;
grant execute on function public.ocupacion_dia(bigint, date) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Tablas internas: solo service_role (Edge Functions). Hasta ahora anon y authenticated
--    tenían todos los privilegios y solo las protegía tener RLS activa sin políticas.
-- ----------------------------------------------------------------------------
revoke all on public.configuracion_taller     from anon, authenticated;
revoke all on public.google_oauth_states      from anon, authenticated;
revoke all on public.integraciones_calendario from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Talleres: un usuario autenticado solo ve la fila de su taller (antes veía user_id e IDs de
--    WhatsApp de todos). La página pública usa el cliente anónimo y no se ve afectada.
-- ----------------------------------------------------------------------------
drop policy "usuarios autenticados pueden leer talleres" on public.talleres;
create policy "usuarios autenticados leen su propio taller" on public.talleres
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Reservas: políticas con (select auth.uid()) (se evalúa una vez por consulta) y regla de
--    transición: solo se puede cambiar una reserva Pendiente o Confirmada, y solo a
--    Confirmada o Cancelada. Una reserva Cancelada ya no se reabre.
-- ----------------------------------------------------------------------------
drop policy "usuarios autenticados pueden ver reservas de su taller" on public.reservas;
create policy "usuarios autenticados pueden ver reservas de su taller" on public.reservas
  for select to authenticated
  using (taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid())));

drop policy "taller puede crear reservas de su propio taller" on public.reservas;
create policy "taller puede crear reservas de su propio taller" on public.reservas
  for insert to authenticated
  with check (
    taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid()))
    and estado in ('Pendiente', 'Confirmada')
  );

drop policy "taller puede confirmar o cancelar sus reservas" on public.reservas;
create policy "taller puede confirmar o cancelar sus reservas" on public.reservas
  for update to authenticated
  using (
    taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid()))
    and estado in ('Pendiente', 'Confirmada')
  )
  with check (
    taller_id in (select t.id from public.talleres t where t.user_id = (select auth.uid()))
    and estado in ('Confirmada', 'Cancelada')
  );

-- ----------------------------------------------------------------------------
-- 6. search_path fijo en el trigger (aviso 0011 del linter). El cuerpo ya usa nombres
--    calificados (public.reservas).
-- ----------------------------------------------------------------------------
alter function public.comprobar_limite_citas_dia() set search_path = '';
