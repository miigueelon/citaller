# Tope diario, festivos de 2027 y "¿quién apunta la cita?"

> **Estado (21-sep-2026, 19:40)**: aprobado por Miguel ("ok continua") y hecho hasta el paso 6 de la
> sección 7: migraciones aplicadas, Edge Function desplegada, `rls-test.sql` 65/65, `probar-cadena`
> todo OK y Playwright 17/17 en local y en el preview. Guardado como etiqueta `v1.1` y copia de la BD
> `backups/2026-09-21_1736`. Falta el paso 7 (producción), que espera el OK de Miguel. Seguimiento con
> casillas en `docs/plan.md`, "Pedidos del 21-sep".

## Context

Miguel pidió el 21-sep cuatro cosas al repasar la lógica de los talleres (la cuarta, el número de
arriba y el historial del panel, está en la sección 8):

1. **Rik and Roll**: 2 citas a la misma hora (ya está) **y como mucho 5 al día** (no existe; hoy
   admite hasta 18 de lunes a jueves). Speedbikes se queda como está: 6 al día a cualquier hora.
   Las citas apuntadas a mano **cuentan** para el tope pero **no se bloquean** (el panel solo avisa),
   igual que hoy con el límite por hora.
2. **Festivos de 2027** (Cataluña) para los dos talleres. Solo están cargados hasta el 26-dic-2026 y el
   cliente reserva a 90 días: desde el **3-oct** podría pedir cita el 1-ene-2027. Los 12 oficiales ya
   están publicados (treball.gencat.cat); los 2 locales de Castelldefels aún no.
3. **Quién apunta la cita** al usar "+ Nueva cita" en el panel, para cuando haya dos mecánicos: elegir
   de una lista de mecánicos del taller; el móvil recuerda el último; la tarjeta dice "Mostrador ·
   Juan". Solo al crear (no al confirmar ni cancelar). Sin nombres todavía: mientras un taller no
   tenga mecánicos cargados, la pregunta no sale.

Todo es compatible hacia atrás: la migración, la Edge Function y el frontend se pueden desplegar en
ese orden sin romper nada entre medias.

## 1. Migración `20260921180000_tope_citas_dia.sql`

- `talleres.max_citas_dia integer null`, check `max_citas_dia is null or max_citas_dia > 0`, comentario
  ("tope de citas activas al día además de `modo_capacidad`; null = sin tope").
- `grant select (max_citas_dia) on public.talleres to anon, authenticated` (la vista es
  `security_invoker`; precedente en `config_taller.sql:51`).
- `create or replace view public.talleres_publicos` con las mismas columnas + `max_citas_dia` al final;
  re-declarar `revoke all` / `grant select` como en `20260921120000_cierre_permisos_publicos.sql:30-42`.
- `create or replace function public.comprobar_capacidad()` (hoy en `config_taller.sql:254-309`): leer
  también `max_citas_dia`; dentro del mismo `pg_advisory_xact_lock` por (taller, día), si no es null,
  contar todas las activas del día (sin filtrar `creada_por`, como hoy) y lanzar `CT001` con "ya tiene
  % citas ese día". Se mantienen las salidas tempranas (no activa, `creada_por='taller'`, confirmar sin
  mover).

## 2. Migración `20260921180100_miembros_taller.sql`

- Tabla `miembros_taller (id identity pk, taller_id → talleres on delete cascade, nombre text not null
  check 1-40 caracteres, activo bool default true, orden int default 0, created_at)`, `unique (taller_id,
  nombre)`. Comentario: en la fase 6 gana `user_id` y `rol` (multiusuario); el nombre ya coincide con
  `docs/arquitectura.md`.
- RLS activa; SELECT solo `authenticated` de su taller (`taller_id in (select t.id from public.talleres t
  where t.user_id = (select auth.uid()))`, mismo patrón que `integridad_y_seguridad.sql:92-95`);
  `revoke all from anon, authenticated; grant select to authenticated`. Escriben seeds y service_role.
- `reservas.creada_por_miembro bigint null references miembros_taller(id) on delete set null` + índice
  + check `creada_por_miembro is null or creada_por = 'taller'`.
- `insertar_reserva_taller` (hoy `config_taller.sql:496-536`): `drop function` de la firma de 10
  argumentos y recrear con `p_miembro_id bigint default null` al final. Si el taller tiene mecánicos
  activos, `p_miembro_id` es obligatorio y tiene que ser uno activo de ese taller; si no, `CT017`
  ("Elige quién apunta la cita"). Se guarda en `creada_por_miembro`. Mismos revoke/grant (solo
  service_role). `notify pgrst, 'reload schema'`.

Antes de `db push`: `npm run backup` y revisión de las dos migraciones por un agente independiente
(como en las fases anteriores). Después, `gen types`.

## 3. Datos (seeds, aplicados con `execute_sql`, idempotentes)

- `clientes/rikandroll/seed.sql`: `max_citas_dia = 5` + festivos 2027. **Se aplica en producción al
  final**, junto con el frontend (paso 7).
- `clientes/speedbikes/seed.sql`: festivos 2027 (se aplica ya).
- Festivos 2027, iguales en los dos (`on conflict (taller_id, fecha) do nothing`): 01-01 Año Nuevo,
  06-01 Reyes, 26-03 Viernes Santo, 29-03 Lunes de Pascua, 01-05 Fiesta del Trabajo, 24-06 San Juan,
  11-09 Diada Nacional de Catalunya, 12-10 Fiesta Nacional de España, 01-11 Todos los Santos, 06-12 Día
  de la Constitución, 08-12 Inmaculada, 25-12 Navidad.
- `clientes/e2e/seed.sql`: `max_citas_dia = 7` (probar-cadena llega a 5 activas en `DIA`; con 7 queda
  margen y se puede probar el tope en un día aparte), mecánicos "Mecánico A" y "Mecánico B". De paso,
  quitar `capacidad_simultanea` del insert (columna borrada en 4.1: el seed ya no se puede re-ejecutar).
- `clientes/_plantilla/seed.sql`: `max_citas_dia = null` con comentario, y un ejemplo comentado de
  mecánicos.
- Los nombres reales de los mecánicos **no van al repo** (datos personales): se cargan en la BD cuando
  Miguel los pase, con el SQL que se documenta en `docs/operaciones.md`.

## 4. Edge Function `crear-reserva-taller`

`supabase/functions/crear-reserva-taller/index.ts:38-49`: pasar `p_miembro_id` (`idPositivo(cuerpo.miembro_id)`
o null). La despliega Miguel: `npx supabase functions deploy crear-reserva-taller` (el modo automático
me lo bloquea). Con la función vieja no pasa nada: los talleres reales no tienen mecánicos.

## 5. Frontend

- `src/features/taller/api.ts`: `max_citas_dia: number | null` en `Taller`, `COLUMNAS_TALLER` y `aTaller`.
- `src/features/reservar/disponibilidad.ts`: `motivoCompleta(ocupacion, hora, capacidad, modo,
  maxDia)` → `"dia" | "hora" | null` (el tope diario se mira siempre que no sea null); `estaCompleta`
  y `horasDisponibles` la usan, y los parámetros ganan `maxDia`. Pruebas nuevas en
  `disponibilidad.test.ts` (por hora con tope diario: la 5.ª llena el día aunque la hora tenga sitio).
- `FechaHora.tsx` y `NuevaCitaModal.tsx`: pasar `taller.max_citas_dia`; el aviso del modal usa el motivo
  ("Ese día ya está completo." / "Esa hora ya está completa."). El calendario sigue sin apagar días
  llenos (como hoy en Speedbikes): el día lleno muestra "No hay horas disponibles para este día."
- `src/lib/erroresDominio.ts`: CT001 → "Ese hueco acaba de llenarse. Elige otra hora u otro día, por
  favor." (el test `/acaba de llenarse/` sigue valiendo) y CT017 nuevo.
- Mecánicos:
  - `src/features/panel/api.ts`: `cargarMiembros(tallerId)` (activos, por `orden, nombre`; mismo
    patrón que `cargarTextosWhatsapp`) y en `COLUMNAS` `miembro:miembros_taller!creada_por_miembro(nombre)`
    → `apuntada_por: string | null` en `ReservaPanel` (`tipos.ts`; actualizar los literales de
    `PanelTaller.tsx:133-151`, `filtros.test.ts`, `textosWhatsapp.test.ts`).
  - `useReservasTaller.ts`: `DatosCitaManual.miembro_id: number | null` (viaja solo en el `...datos`).
  - `src/features/panel/miembroRecordado.ts` (nuevo): leer y guardar `citaller-miembro-<tallerId>` en
    localStorage, todo con try/catch; si el guardado ya no está en la lista, no se preselecciona. Con test.
  - `NuevaCitaModal.tsx`: prop `miembros`; si hay alguno, primera fila `<select name="miembro_id">`
    "¿Quién la apunta?", obligatorio en `completo`; al guardar bien, se recuerda.
  - `PanelTaller.tsx`: cargar miembros y pasarlos al modal.
  - `TarjetaReserva.tsx:35-39`: la etiqueta pasa a "Mostrador · Juan" (sigue diciendo "Mostrador", que
    comprueba Playwright) y el `title` a "Cita apuntada desde el panel por Juan".

## 6. Pruebas

- `scripts/rls-test.sql`: #43-44 con la firma nueva de 11 argumentos; nuevas: anon lee
  `talleres.max_citas_dia`; la vista la expone; RLS activa en `miembros_taller`; anon no lee
  `miembros_taller`; su SELECT exige `auth.uid()`.
- `scripts/probar-cadena.mjs`:
  - A: la vista expone `max_citas_dia = 7`.
  - Sección nueva de tope diario en `DIA_3 = diaLaborable(16)`: 7 reservas (2+2+2+1, teléfonos
    distintos) y la 8.ª a las 12:00, con hueco en la hora, se rechaza con CT001 "día".
  - G: leer los mecánicos de e2e con la sesión del taller; sin `miembro_id` → CT017; con uno que no
    existe → CT017; con "Mecánico A" → 200 y `creada_por_miembro` guardado; las otras citas a mano del
    script (L241, L285) mandan `miembro_id`.
- Playwright `tests/e2e/panel.spec.ts:57-86`: elegir "Mecánico A" y comprobar "Mostrador · Mecánico A".
- `npm test`, `npm run lint`, `npm run build`; advisors de Supabase sin avisos nuevos.

## 7. Orden y producción

Solo hay un proyecto de Supabase, así que la migración y la Edge Function van directas a producción.
Son compatibles hacia atrás.

1. Backup → revisión independiente → `db push` → `gen types`.
2. Seeds de e2e y festivos de Speedbikes y Rik and Roll con `execute_sql`.
3. Código y pruebas unitarias; commit en `reestructuracion`.
4. **Miguel**: `npx supabase functions deploy crear-reserva-taller`.
5. `rls-test.sql`, `probar-cadena`, Playwright en local y contra el preview.
6. **Parar y pedir el OK de producción.**
7. Con el OK: merge a `main` (despliega Vercel), `max_citas_dia = 5` en Rik and Roll y Playwright contra
   `citaller.es`. Comprobación a mano: `/rikandroll` con 5 activas en un día no ofrece horas.

## 8. Panel: número de arriba e historial (pedido del 21-sep, M9)

Miguel: el historial muestra **solo las citas confirmadas** (las de la web y las apuntadas a mano, que
nacen confirmadas); las canceladas ni salen ni cuentan. El número de arriba muestra **las dos cosas**:
citas de hoy y solicitudes por responder.

- `src/features/panel/filtros.ts`:
  - `historial()` filtra `estado === "Confirmada"` (las pendientes que nadie respondió tampoco salen;
    con la caducidad de 5B pasarán a "Caducada").
  - `resumenCabecera(reservas, ahora)` → `{ citasHoy, porResponder }`: `citasHoy` = confirmadas de hoy;
    `porResponder` = pendientes de hoy en adelante. Sustituye a `totalValidas` (que se borra).
- `CabeceraPanel.tsx`: subtítulo "Hoy: 3 citas · 2 por responder" ("Hoy: 1 cita", "Hoy: sin citas";
  sin pendientes, "· todo al día"). En el historial, "N citas pasadas" (solo confirmadas).
- `PanelTaller.tsx:83-84`: el historial agrupa por día con `agruparPorDia` (hoy repite la fecha en cada
  cita) y **aplica el buscador** (hoy se ve pero no hace nada). Los filtros de estado y de fecha se
  ocultan en el historial porque ahí no aplican.
- `filtros.test.ts`: historial sin canceladas ni pendientes; `resumenCabecera` con citas de hoy,
  pendientes futuras y canceladas que no cuentan.

## 9. Documentación

- `docs/plan.md`: bloque "Pedidos del 21-sep" con estas tres casillas; pendiente "festivos locales de
  Castelldefels 2027 (cuando se publiquen)"; la fase 6 parte de `miembros_taller` ya creada (añade
  `user_id` y `rol`) y de `creada_por_miembro` en lugar de `creada_por_usuario`.
- `docs/idea.md:24`: Rik and Roll "2 por hora, máx. 5 al día".
- `docs/operaciones.md`: `max_citas_dia` en la lista de configuración del seed; "Añadir o dar de baja un
  mecánico" (SQL de una línea); "cada septiembre, cargar los festivos del año siguiente".
