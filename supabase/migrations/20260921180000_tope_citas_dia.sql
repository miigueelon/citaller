-- Tope de citas al día además del modo de capacidad (pedido de Miguel, 21-sep-2026). Rik and Roll
-- admite 2 coches a la misma hora pero no más de 5 en todo el día; hasta ahora un taller `por_hora`
-- no tenía tope diario. Ver docs/plan.md, "Pedidos del 21-sep".
--
-- Compatible hacia atrás: la columna nace a null (sin tope) en todos los talleres. El valor de cada
-- taller va en su seed (`clientes/<slug>/seed.sql`). El frontend que no conoce la columna sigue
-- funcionando: si ofrece una hora de un día ya lleno, el trigger la rechaza con CT018.
--
-- Lo que cambia:
--   1. `talleres.max_citas_dia` (null = sin tope), legible por la web pública.
--   2. La vista `talleres_publicos` la expone.
--   3. El trigger `comprobar_capacidad` la aplica dentro del mismo bloqueo por taller y día.

-- 1. Columna
alter table public.talleres
  add column max_citas_dia integer;

alter table public.talleres
  add constraint talleres_max_citas_dia_check check (max_citas_dia is null or max_citas_dia > 0);

comment on column public.talleres.max_citas_dia is 'Tope de citas activas en todo el día, además de modo_capacidad/capacidad. Null = sin tope. Cuentan también las apuntadas a mano, pero a esas no se les aplica (el panel solo avisa).';

-- La vista es security_invoker: anon necesita leer la columna en la tabla.
grant select (max_citas_dia) on public.talleres to anon, authenticated;

-- 2. Vista pública. `create or replace view` solo admite columnas nuevas al final.
create or replace view public.talleres_publicos with (security_invoker = true) as
  select id, nombre, telefono, direccion, ciudad, horario_texto, valoracion, numero_resenas, slug,
         modo_capacidad, capacidad, texto_aviso_tarde, texto_confirmacion, whatsapp_modo,
         max_citas_dia
  from public.talleres
  where activo;
revoke all on public.talleres_publicos from public, anon, authenticated;
grant select on public.talleres_publicos to anon, authenticated;

-- 3. Trigger de capacidad: el límite del modo (por hora o por día) y, además, el tope diario.
create or replace function public.comprobar_capacidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modo     text;
  v_cap      integer;
  v_max_dia  integer;
  v_ocupadas integer;
begin
  -- Solo cuentan las reservas activas.
  if new.estado not in ('Pendiente', 'Confirmada') then
    return new;
  end if;

  -- El taller apunta citas a mano en cualquier hora: el panel avisa, no bloquea.
  if new.creada_por = 'taller' then
    return new;
  end if;

  -- Confirmar (o cualquier cambio que no mueva la cita) no consume hueco nuevo.
  if tg_op = 'UPDATE' and old.estado in ('Pendiente', 'Confirmada') and old.dia = new.dia and old.hora = new.hora then
    return new;
  end if;

  select modo_capacidad, capacidad, max_citas_dia into v_modo, v_cap, v_max_dia from public.talleres where id = new.taller_id;
  if v_modo is null then
    return new;
  end if;

  -- Serializa las reservas del mismo taller y día: dos clientes no pueden coger el mismo hueco.
  perform pg_advisory_xact_lock(hashtext('reservas:' || new.taller_id::text || ':' || new.dia::text));

  select count(*) into v_ocupadas
  from public.reservas r
  where r.taller_id = new.taller_id
    and r.dia = new.dia
    and r.estado in ('Pendiente', 'Confirmada')
    and r.id is distinct from new.id
    and (v_modo = 'por_dia' or r.hora = new.hora);

  if v_ocupadas >= v_cap then
    raise exception 'Sin hueco: el taller ya tiene % citas en ese %', v_cap, case when v_modo = 'por_dia' then 'día' else 'horario' end
      using errcode = 'CT001';
  end if;

  -- Tope diario (cuentan todas las activas del día, también las apuntadas a mano).
  if v_max_dia is not null then
    select count(*) into v_ocupadas
    from public.reservas r
    where r.taller_id = new.taller_id
      and r.dia = new.dia
      and r.estado in ('Pendiente', 'Confirmada')
      and r.id is distinct from new.id;

    -- Código propio (CT018) para que la web diga "elige otro día" y no "elige otra hora". El texto
    -- encaja con el respaldo por texto del frontend anterior (/máximo de \d+ citas/).
    if v_ocupadas >= v_max_dia then
      raise exception 'Sin hueco: máximo de % citas ese día', v_max_dia
        using errcode = 'CT018';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.comprobar_capacidad() from public, anon, authenticated;
