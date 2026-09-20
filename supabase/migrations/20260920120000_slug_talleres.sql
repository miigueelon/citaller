-- ============================================================================
-- FASE 2b (docs/plan.md): identificador público de cada taller en la URL.
-- Antes: ?taller=<id numérico>. Ahora: /<slug>, /<slug>/panel y /<slug>/cita/<token>.
-- ============================================================================

alter table public.talleres add column slug text;

-- Talleres existentes. Los que no estén en la lista reciben un slug derivado del nombre
-- (solo letras, números y guiones), que se puede cambiar después desde su seed.
update public.talleres set slug = 'speedbikes' where nombre = 'Speedbikes Moto'      and slug is null;
update public.talleres set slug = 'rikandroll' where nombre = 'Rik and Roll'         and slug is null;
update public.talleres set slug = 'e2e'        where nombre = 'Taller de pruebas e2e' and slug is null;
update public.talleres
set slug = trim(both '-' from lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null;

alter table public.talleres alter column slug set not null;
alter table public.talleres add constraint talleres_slug_unico unique (slug);
alter table public.talleres add constraint talleres_slug_formato
  check (slug ~ '^[a-z0-9-]{3,40}$');
-- Palabras que son rutas de la app o podrían serlo; nunca pueden ser un taller.
alter table public.talleres add constraint talleres_slug_reservado
  check (slug not in ('panel', 'login', 'admin', 'api', 'cita', 'clientes', 'assets', 'qr', 'static', 'public', 'app'));

comment on column public.talleres.slug is
  'Identificador público del taller en la URL (/<slug>). Minúsculas, números y guiones; único.';

-- La vista pública es security_invoker: anon necesita el grant de la columna.
grant select (slug) on public.talleres to anon, authenticated;

-- `create or replace view` solo admite columnas nuevas al final.
create or replace view public.talleres_publicos
  with (security_invoker = true) as
  select id, nombre, telefono, direccion, ciudad, capacidad_simultanea,
         horario_texto, valoracion, numero_resenas, slug
  from public.talleres
  where activo;
