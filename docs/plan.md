# Plan CiTaller v2: tomar el control con Claude Code, de extremo a extremo

> Cómo se usa: cada paso tiene una casilla. Claude ejecuta una fase, marca casillas, verifica la cadena completa y **se detiene al final de cada fase** para que apruebes la siguiente. Copia canónica en el repo: `docs/plan.md` (se crea en la Fase 0). Nada se sube a `main` ni se despliega a producción sin tu OK. **Claude no ejecuta ninguna fase, ni siquiera la 0, sin aprobación explícita de este plan.**

## 0. Estado a 19-sep-2026 (qué se ha ejecutado ya, por error de interpretación, y cómo deshacerlo)

Al desactivarse el modo plan, Claude empezó la Fase 0 sin aprobación. Todo es local y reversible; nada se ha subido a GitHub ni desplegado:
- Git: commit `d2dca73` en `main` con el trabajo que estaba sin commitear (tag `v0-baseline`); rama `reestructuracion` con `72f16e3` (`.gitattributes`) y `7a75b87` (borrado de `citaller/citaller/`). Sin push.
- Vercel: variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` creadas (production, preview, development). Inofensivas hasta que el código las use en producción.
- Ficheros sin commitear en la rama: `docs/{idea,arquitectura,integraciones,operaciones,checklist-manual}.md`, `CLAUDE.md`, `src/config/env.js`, `vercel.json`, `.env.local` (ignorado), cambios en `src/lib/supabaseClient.js` (lee de `import.meta.env`) y `.gitignore`. `npm run build` pasa. No se instaló la CLI de Supabase ni se escribieron `README.md`, `.env.example`, `.vscode/`, `docs/plan.md`.
- Para deshacer todo: `git checkout main && git reset --hard 3c58927 && git branch -D reestructuracion && git tag -d v0-baseline`, borrar los ficheros nuevos, y quitar las dos variables en Vercel. Para conservarlo: al aprobar el plan, la Fase 0 continúa desde 0.3.

## 1. Contexto

CiTaller es una app de reserva de citas para talleres (hoy Speedbikes Moto y Rik and Roll), construida pegando código de ChatGPT, sin estructura, sin migraciones y con las integraciones (Google Calendar, WhatsApp de Meta) montadas a mano en la nube de Supabase. Objetivo: que Claude Code tome el control con una estructura limpia y escalable como SaaS multi-taller, todo versionado en el repo, y **que cada flujo funcione de extremo a extremo** (navegador → Supabase → Google/Meta → vuelta) y se pueda verificar.

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Escalado | SaaS multi-tenant. Alta de taller sin tocar código. |
| TypeScript | Sí, durante la reestructuración. |
| Config por taller | Fuente de verdad en BD. En el repo, `clientes/<slug>/` con seed, assets y notas; **sin secretos** (ni tokens, ni refresh_token, ni IDs de WhatsApp). |
| Supabase | Todo al repo con Supabase CLI. **Flujo solo remoto, sin Docker**: migraciones escritas a mano + `db push`; backup antes de cada migración. Docker queda como opción futura. |
| URLs | `/<slug>` y `/<slug>/panel`; redirección de `?taller=N`. Slugs reservados prohibidos por CHECK. |
| Google | Un proyecto de Google Cloud; cada taller conecta su Calendar. Claude guía los logins por terminal. |
| Usuarios | Varios empleados por taller, con registro de quién hace qué. |
| Cliente final | Sin cuenta; identificado por teléfono. |
| Producción | Sin clientes reales aún (datos de prueba). Se trabaja en la rama `reestructuracion`; `main` y producción no cambian hasta que una fase esté verificada y tú lo apruebes. |
| Fechas y horas | Se guardan como `dia date` + `hora time` **en hora local del taller** + `talleres.zona_horaria`; solo se convierten en los bordes (eventos de Calendar, "mañana" del cron). Nunca `new Date("YYYY-MM-DD")`. |
| Estilos | CSS propio en tokens + CSS Modules. Fuera Tailwind y FullCalendar. |
| Tests | Vitest solo para lógica pura (ficheros `*.test.ts` junto al código); **Playwright smoke** (reservar en cada taller, confirmar/cancelar en panel) contra el preview de Vercel con un taller de pruebas `e2e`; script SQL de pruebas RLS con `set role`; `docs/checklist-manual.md`. |
| Alcance mínimo | Solo se crea en BD lo que sustituye un hardcode actual o una decisión cerrada. `eventos_reserva`, `clientes`/`vehiculos`, marca por taller, zona horaria, duración y ventana de reserva pasan a roadmap (revisión independiente: "sobra para dos talleres"). |
| Roadmap (no ahora) | Panel admin de alta de talleres; cliente cancela/cambia por enlace; ficha de cliente e historial; facturación; Outlook; Turnstile anti-abuso; staging separado cuando haya el primer cliente real. |

## 3. Diagnóstico verificado

### Código (repo)
- React 19 + Vite 8 + JS; 8 ficheros de código y 1.739 líneas de CSS; sin router, tests, `.env` ni CLAUDE.md. Lógica por taller en 11 puntos (`tallerId === 1/2`). `PanelTaller.jsx` 1.096 líneas. Estado de reserva duplicado 3 veces (falta `cantidad_neumaticos` en 2). `citaller/citaller/` es un scaffold vacío trackeado. LF/CRLF mezclado.
- **Línea base ejecutada hoy**: `npm run build` OK (3,9 s; `logo.png` pesa 2,1 MB y se sirve a todos); `npm run lint` **4 errores y 3 avisos** (setState en efectos, prop sin usar, dependencias de efectos).
- Git: `main` local = `origin/main` (15-sep). Hay **1.665 líneas sin commitear** (versión multi-taller) que **no están en producción**.

### Supabase (`zrrqqqbgwwovmglhqxwn`, eu-west-3, PG 17)
- Sin migraciones. 7 tablas: `talleres`, `reservas`, `horarios_taller`, `festivos_taller`, `configuracion_taller` (no usada por el frontend), `integraciones_calendario` (refresh_token en claro), `google_oauth_states`. Columnas legacy duplicadas en `reservas` y `talleres`.
- RPC `crear_reserva_publica` (SECURITY DEFINER) inserta sin validar. Trigger `comprobar_limite_citas_dia` hardcodea taller 1 y límite 6.
- **Permisos (corrección importante)**: hay **grants por columna**. `anon` solo lee `dia, estado, hora, taller_id` de `reservas` y las columnas públicas de `talleres`. **No hay fuga de datos personales** (verificado con la clave pública: `telefono` y `user_id` devuelven 401). `authenticated` solo puede actualizar `estado`. Lo que sí queda: `anon` puede **insertar directamente** en `reservas` (además de la RPC) sin ninguna validación de taller/hora/capacidad; `authenticated` ve `user_id` y IDs de WhatsApp de todos los talleres; `configuracion_taller`, `integraciones_calendario` y `google_oauth_states` tienen privilegios completos para anon/authenticated y solo las protege "RLS sin políticas"; políticas basadas en `talleres.user_id` (1 usuario = 1 taller); protección de contraseñas filtradas desactivada; registro público de usuarios a comprobar.
- Datos: 2 talleres, 16 reservas de prueba (todas de estos días; ninguna Pendiente), 2 usuarios. Speedbikes (motos, capacidad 6, `calendar_provider='outlook'` sin conectar). Rik and Roll (capacidad 2, Google conectado el 17-sep, **3/3 confirmadas tienen evento en Google** → crear evento funciona de extremo a extremo). Ningún WhatsApp enviado nunca (inactivo en ambos).
- Edge Functions (6):

| Slug | Código real | Estado verificado |
|---|---|---|
| `dynamic-function` | crear evento Google | **Roto para su uso**: el botón "Conectar Google Calendar" la llama con `taller_id` esperando `auth_url`; el código de inicio de OAuth se perdió (no está en tu disco). |
| `quick-worker` | crear evento Google (copia) | Funciona (es la que usa "Confirmar") |
| `cancelar-evento-google` | borrar evento | Funciona |
| `bright-service` | callback OAuth | Viva (400 sin parámetros). `REDIRECT_URI` fija a su slug. |
| `bright-processor` | WhatsApp confirmación (Meta, plantilla `confirmacion_cita`, token por taller en env `WHATSAPP_TOKEN_TALLER_<id>`) | Viva; WhatsApp inactivo |
| `hyper-processor` | recordatorios (cron 08:00, `x-cron-secret`) | **Roto**: `verify_jwt=true` y el cron no envía JWT → `401` reproducido hoy en vivo y en `net._http_response`. |

### Entorno y despliegue
- Equipo: git, node 24, npm 11, winget. Sin Supabase CLI, gcloud, Vercel CLI, Deno, Docker.
- Vercel: proyecto `citaller` conectado a GitHub (`main` → producción). **`citaller.vercel.app` es pública** (HTTP 200 verificado; la protección solo afecta a previews). **Cero variables de entorno** en Vercel.
- Google Cloud: pendiente `gcloud`. **A comprobar en consola**: estado de la pantalla de consentimiento (si está en "Testing", los refresh tokens caducan a los 7 días y "Conectar Google Calendar" dejará de funcionar semanalmente) y las redirect URIs del cliente OAuth.

## 4. Cadena end-to-end por flujo (qué debe estar en pie y cómo se comprueba)

| Flujo | Cadena | Debe existir | Verificación |
|---|---|---|---|
| A. Reservar (público) | `/<slug>` → `talleres_publicos`, `servicios_taller`, `campos`, `horarios`, `festivos`, RPC `ocupacion_dia` → RPC `crear_reserva_publica` | grants anon solo a vistas/RPC; RPC valida y limita abuso; Vercel con `VITE_*` y rewrite SPA | Playwright: reserva en `e2e`; SQL: fila creada con `datos_extra`; RLS script: anon no lee PII |
| B. Login y panel | `/<slug>/panel` → Auth → `miembros_taller` → `reservas` del taller | políticas por pertenencia; registro público desactivado | Playwright: login `e2e`; RLS script: usuario de A no ve reservas de B |
| C. Confirmar | panel → Edge `confirmar-reserva` → `estado` + `eventos_reserva` → WhatsApp (si activo) → Calendar (si conectado) | secrets `GOOGLE_CLIENT_ID/SECRET`, tokens WhatsApp, plantilla Meta aprobada | Playwright + SQL: `google_event_id` relleno en Rik and Roll; `eventos_reserva` con `user_id` |
| D. Cancelar | panel → Edge `cancelar-reserva` → estado → borrar evento (mejor esfuerzo) | ídem | SQL: `google_event_id` a null; fallo de Google no bloquea |
| E. Conectar Calendar | botón → Edge `conectar-google-calendar` (`auth_url`) → Google → Edge `google-calendar-callback` → Vault → redirige a `/<slug>/panel?calendar=connected` | redirect URI registrada en Google Cloud; consentimiento "In production"; `CITALLER_APP_URL` | Manual guiado en Rik and Roll; SQL: `integraciones_calendario.conectado` |
| F. Recordatorios | pg_cron 08:00 → Edge `enviar-whatsapp-recordatorios` (`verify_jwt=false`, secreto en Vault) | cron creado por migración | Invocación manual + `net._http_response` = 200 a la mañana siguiente |
| G. Deploy | rama → preview Vercel (protegido) → `main` → producción | env vars en Vercel; `vercel.json` | Smoke en preview antes de aprobar merge |

## 5. Estructura objetivo

```
citaller/
├── CLAUDE.md · README.md · .env.example · .gitattributes · vercel.json
├── docs/  idea.md · plan.md (este plan con casillas) · arquitectura.md (flujos, modelo de datos, decisión de fechas)
│          integraciones.md (Google OAuth: consentimiento, redirect URIs, secrets; Meta: plantillas, tokens; cron)
│          operaciones.md (alta de taller, backups, deploy, qué se hace a mano en el dashboard) · checklist-manual.md
├── clientes/  README.md · _plantilla/ · speedbikes/{seed.sql,assets/,README.md} · rikandroll/{...} · e2e/ (taller de pruebas)
├── supabase/  config.toml (verify_jwt por función, auth) · migrations/ · seed.sql
│   └── functions/ _shared/{cors,adminClient,autorizarMiembro,google,whatsapp,vault}.ts
│        conectar-google-calendar/ · google-calendar-callback/ · confirmar-reserva/ · cancelar-reserva/
│        enviar-whatsapp-recordatorios/  (crear/cancelar evento y WhatsApp pasan a ser módulos de _shared usados por confirmar/cancelar)
├── scripts/  sync-clientes.mjs (assets → public/clientes/<slug>/) · backup.mjs · rls-test.sql
├── tests/e2e/  reservar.spec.ts · panel.spec.ts (Playwright)
└── src/
    ├── main.tsx · app/{App,router}.tsx · app/providers/{TallerProvider,AuthProvider}.tsx
    ├── config/env.ts · lib/supabase/{client,database.types}.ts · lib/fechas.ts
    ├── features/taller/ (api, tipos TallerConfig, useTaller) · features/reservar/ (ReservarPage, pasos/, useReservaWizard, disponibilidad.ts, validacion.ts, api)
    ├── features/panel/ (PanelPage, LoginPage, componentes/, useReservasTaller, filtros.ts, api) · features/integraciones/
    ├── components/ (CampoInput, Boton, Alerta, Modal, Cargando, Layout) · styles/{tokens,base}.css + *.module.css · assets/
```

Mapeo: `App.jsx` → `router` + `ReservarPage` + `useReservaWizard` + `reservar/api`; `ReservaForm` → `pasos/DatosForm` (+ campos extra); `FechaHora` → `pasos/FechaHora` + `disponibilidad.ts` + `useDisponibilidad`; `Confirmacion` → `pasos/Resumen` + `ReservaConfirmada`; `LoginTaller` → `panel/LoginPage`; `PanelTaller` → `panel/*`; `supabaseClient.js` → `lib/supabase/client.ts`; CSS → `styles/` + módulos.

## 6. Modelo de configuración por taller (BD)

| Hoy (código) | Mañana (BD) |
|---|---|
| Kilómetros solo taller 1 | `campos_formulario_taller (taller_id, servicio_id null=todos, clave, etiqueta, tipo numero/texto/select, opciones jsonb, obligatorio, orden, unidad)`; valor en `reservas.datos_extra jsonb` |
| Neumáticos taller 2 (cantidad, medidas, imagen) | `servicios_taller (taller_id, nombre, orden, activo, descripcion_modo oculta/opcional/obligatoria, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda, imagen_ayuda_url, duracion_min)` + campo extra `cantidad_neumaticos` ligado al servicio |
| Catálogo de servicios fijo | `servicios_taller` (seed reproduce los 7 actuales por taller) |
| Capacidad por día (1) vs por hora | `talleres.modo_capacidad ('por_hora'\|'por_dia')` + `talleres.capacidad`; trigger genérico; absorbe `configuracion_taller` |
| Fin de semana a mano | se elimina; manda `horarios_taller.dia_semana` |
| Aviso de tarde fijo | `talleres.texto_aviso_tarde` |
| Google solo 1 y 2 | existencia de `integraciones_calendario` conectada |
| Textos "WhatsApp" en la confirmación | `talleres.texto_confirmacion` (nullable; si es null, texto genérico sin prometer WhatsApp) |
| `?taller=1` | `talleres.slug` unique, CHECK `^[a-z0-9-]{3,40}$` y no en (`panel`,`login`,`admin`,`api`,`clientes`,`assets`,`e2e-*`...) |
| *(roadmap, no ahora)* | `tipo_vehiculo`, `logo_url`, `color_primario`, `titulo_publico`, `duracion_cita_min`, `zona_horaria`, `antelacion_*` |

Nuevas tablas (fase 4): `miembros_taller (user_id, taller_id, rol, nombre, activo)`; `reservas.confirmada_por, confirmada_en, cancelada_por, cancelada_en` (cubre "quién hizo qué" para las dos acciones que existen). Roadmap: `eventos_reserva`, `clientes`, `vehiculos`.

Integridad: FK `reservas.taller_id → talleres(id)` (hoy no existe: `?taller=999` crea reservas huérfanas). Sin índice único por hora porque la capacidad por hora puede ser >1 (Rik and Roll = 2); la concurrencia se resuelve con bloqueo en la RPC.

Seguridad pública: vista `talleres_publicos`; RPC `ocupacion_dia(taller_id, dia) → (hora, n)`; se revoca INSERT directo de anon en `reservas` (solo RPC); se revocan privilegios sobrantes de anon/authenticated en tablas internas (hoy tienen `GRANT ALL` y solo las protege RLS sin políticas); los **grants por columna actuales se conservan** y deben aparecer en la migración baseline; `crear_reserva_publica` v2 valida taller activo, servicio, festivo, horario, futuro, capacidad (con bloqueo transaccional), formato de teléfono/matrícula, `datos_extra` contra `campos_formulario_taller`, **límite por teléfono** (máx. 3 activas por taller y 5 creaciones/día), y errores con `errcode` de dominio.

## 7. Fases

### Fase 0 — Accesos, línea base y documentación (sin cambiar comportamiento)
- [x] 0.1 Commit en `main` del trabajo sin commitear ("Baseline estable pre-reestructuración"), **sin push**. Rama `reestructuracion`. Tag `v0-baseline`. *(hecho, ver sección 0)*
- [x] 0.2 Commit con `.gitattributes` (`* text=auto eol=lf`). Commit borrando `citaller/citaller/`. *(hecho)*
- [ ] 0.3 Docs: `docs/idea.md`, `docs/arquitectura.md`, `docs/integraciones.md`, `docs/operaciones.md`, `docs/checklist-manual.md`, `CLAUDE.md` *(escritos, sin commitear)*; pendientes `docs/plan.md`, `README.md`, `.env.example`, `.vscode/settings.json` (extensión Deno). Commit "Documentación y guía para Claude Code".
- [ ] 0.4 **Vercel primero**: variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` *(creadas)*. `src/config/env.js` + `.env.local` + `vercel.json` + `.gitignore` *(escritos, sin commitear; build verificado)*. Commit "Configuración por variables de entorno".
- [ ] 0.5 CLIs y logins guiados (Claude ejecuta y te dice qué pulsar en el navegador): `npm i -D supabase` → `npx supabase login` → `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn` (pide la contraseña de BD: Supabase → Project Settings → Database, se puede resetear ahí). `winget install Google.CloudSDK` → `gcloud auth login` → `gcloud config set project …`. `npm i -g vercel` → `vercel login` → `vercel link`. Deno: `winget install DenoLand.Deno` (para tipar funciones en el editor). Comprobación: `npx supabase projects list`, `gcloud auth list`, `vercel whoami`.
- [ ] 0.6 Supabase al repo: `npx supabase init`; **backup** (`npx supabase db dump -f backups/<fecha>-schema.sql` y `--data-only`; si exige Docker: `pg_dump` vía winget o `scripts/backup.mjs` con `pg`); migración `0001_baseline.sql` a partir del esquema real (tablas, **grants por columna verificados en el fichero**, políticas, RPC, trigger; el cron se recrea en la fase 1 con `cron.schedule` y secreto en Vault) marcada como aplicada con `migration repair`; `functions download` de las 6 con sus slugs actuales (el renombrado es de la fase 1); `config.toml` declarando `verify_jwt=false` en las funciones que hoy lo tienen (`bright-processor`, `bright-service`) para que un redeploy no cambie el comportamiento, y `[db.seed] sql_paths = ["../clientes/*/seed.sql"]`; `gen types`; `secrets list` (solo nombres) documentado en `integraciones.md`; auth en `config.toml` (`enable_signup=false`, contraseñas filtradas) y `config push` o nota en `operaciones.md`. `src/features/integraciones/edgeFunctions.js` con los slugs **actuales** centralizados (renombrar pasa a ser un cambio de una línea).
- [ ] 0.7 Google Cloud: `gcloud services list --enabled` (Calendar API); en consola, estado del consentimiento (pasar a "In production" si está en Testing) y redirect URIs actuales. Documentar.
- [ ] 0.8 `scripts/rls-test.sql` (con `set role anon/authenticated`) ejecutado y guardado como referencia de la línea base.
- **Cierre**: build y lint como en la línea base; `git status` limpio en la rama; `migration list` con la baseline; 6 funciones en el repo; tag `v0-fase0`. **Parar y pedir aprobación.**

### Fase 1 — Arreglar y asegurar la cadena en Supabase (aditivo primero)
- [ ] 1.1 Backup. Migración `integridad_y_seguridad`: FK `reservas.taller_id`; vista `talleres_publicos`; RPC `ocupacion_dia`; revocar `GRANT ALL` sobrantes de anon/authenticated en tablas internas; `estado` con CHECK; política UPDATE que exija estado previo `Pendiente` para confirmar. Frontend usa vista y RPC (cambio mínimo). Después: revocar INSERT directo de anon.
- [ ] 1.2 Recordatorios: `verify_jwt=false` en `config.toml`, secreto a Vault, cron recreado por migración. Verificación: invocación manual 200; `net._http_response` 200 al día siguiente.
- [ ] 1.3 Google: `_shared/{google,vault}.ts`; nueva `conectar-google-calendar` (taller derivado de la sesión, `state` de un solo uso); callback guarda el token en Vault; crear/cancelar leen de Vault; frontend usa los nombres nuevos y valida el origen de `auth_url`. Registrar la redirect URI nueva en Google Cloud **antes** de desplegar; verificar el ciclo completo en Rik and Roll; cron a la URL nueva; `CITALLER_APP_URL` al dominio de Vercel. **Las funciones viejas se mantienen desplegadas al menos una semana** después de que el bundle nuevo esté en producción (navegadores con bundle cacheado), y solo entonces se borran.
- [ ] 1.4 `SET search_path` en el trigger; `(select auth.uid())` en políticas; contraseñas filtradas; registro público desactivado.
- **Cierre**: `get_advisors` sin WARN de seguridad; `rls-test.sql` en verde; flujos C, D, E, F verificados; tag `v0-fase1`. **Parar.**

### Fase 2 — Reestructurar el frontend con comportamiento idéntico (un commit por subfase, app funcionando)
- [ ] 2a Tooling: `tsconfig` (strict, `allowJs`), `vite.config.ts`, Vitest, ESLint TS, CSS Modules; quitar tailwind y fullcalendar; Playwright instalado con `tests/e2e/` y taller `e2e` (seed).
- [ ] 2b `lib/supabase/client.ts` (un cliente público y uno autenticado, `detectSessionInUrl: false`: el callback OAuth vuelve con query params, no con tokens), `config/env.ts`, `lib/fechas.ts` (+tests). Migración `slug` (backfill). Router + `TallerProvider` + `AuthProvider` **con la comprobación de pertenencia que hoy hace `LoginTaller.jsx:34-53`** (`talleres.user_id`; en la fase 4 pasa a `miembros_taller`) + redirección `?taller=N[&modo=taller]` (conservando `calendar=connected`); slug desconocido → 404. Orden de migración a TS: `CampoInput → Confirmacion → LoginTaller → FechaHora → ReservaForm → PanelTaller`, con `allowJs` hasta el final.
- [ ] 2c `features/reservar`: `useReservaWizard` (un solo estado inicial, actualizaciones funcionales), `disponibilidad.ts` puro (+tests, incluido cruce de medianoche), páginas. La lógica por taller se concentra en `features/taller/configTemporal.ts` (único sitio con `1`/`2`; regla en `CLAUDE.md`: nunca comparar ids de taller en la UI).
- [ ] 2d `features/panel`: hooks + componentes; `filtros.ts` (+tests); `Modal`/`Alerta` en vez de `alert`/`confirm`.
- [ ] 2e Estilos: `tokens.css`, `base.css`, módulos; fuera `index.css` de plantilla, los 51 `!important`, los 22 bloques inline; **borrar CSS muerto** (`.app .badge .volver .progreso* .confirmacion* .inicio-demo .inicio-card`) y el bloque duplicado `.buscador-reservas`; `lang="es"`; `logo.png` (2,1 MB) y `guia_neumatico.png` (627 KB) comprimidos.
- **Cierre**: lint 0 errores, tests en verde, Playwright en verde contra preview; recorrido de `checklist-manual.md` en los dos talleres; tag `v0-fase2`. **Parar.**

### Fase 2.5 — Correcciones de comportamiento (hallazgos confirmados en el código)
- [ ] Paso 3 pasa a `Resumen` + pantalla `ReservaConfirmada` solo tras guardar; botón bloqueado mientras guarda (hoy el doble clic duplica reservas).
- [ ] `useDisponibilidad`: una sola bandera de carga (hoy la capacidad se carga aparte y da falsos "No hay horas"), cancelación de peticiones obsoletas, reset en error.
- [ ] Panel: fuera el filtro de fin de semana (oculta reservas futuras de sábado/domingo), `[tallerId]` en efectos, `TarjetaReserva` fuera del componente, historial agrupado, acciones deshabilitadas en pasadas y durante la operación (las Edge Functions ya son idempotentes por `whatsapp_confirmacion_enviada` y `google_event_id`; la deshabilitación es por UX y por el update de 0 filas), contador coherente, "hoy" se recalcula, `valoracion` 0 no se oculta.
- [ ] Sesión: usuario derivado de cada evento de `onAuthStateChange` (parpadeo al recargar).
- [ ] Al cambiar de servicio se limpian campos dependientes. `CampoInput` reenvía `placeholder`/`inputMode`. `validarReserva` con formato de teléfono y matrícula. Errores de dominio traducidos.
- **Cierre**: tests nuevos por cada corrección; Playwright en verde; tag `v0-fase2.5`. **Parar.**

### Fase 3 — Configuración por taller en BD y orquestación en servidor
- [ ] 3.1 Backup. Migración `config_taller` (sección 6), `crear_reserva_publica` v2, trigger genérico. Seeds `clientes/speedbikes`, `clientes/rikandroll`, `clientes/e2e`, `_plantilla`. `scripts/sync-clientes.mjs`. Garantías mecánicas de "no mezclar clientes": test `seeds.test.ts` (cada seed falla si menciona otro slug) y regla ESLint `no-restricted-imports` (nada en `src/` importa de `clientes/`).
- [ ] 3.2 Frontend: `TallerConfig`; servicios y campos extra dinámicos; capacidad por modo; resumen y tarjeta iteran campos; texto de confirmación por taller; borrar `configTemporal.ts`.
- [ ] 3.3 Edge: `confirmar-reserva` y `cancelar-reserva` (estado + `confirmada_por`/`cancelada_por` → WhatsApp → Calendar, en servidor, con fallo registrado en columnas de la reserva); el panel llama a una sola función por acción.
- [ ] 3.4 Prueba de escalado: alta de un taller solo con `_plantilla` + seed; reservar y panel sin tocar código; borrarlo.
- **Cierre**: `grep "=== 1\|=== 2" src/` vacío; Playwright y checklist en verde en los dos talleres; tag `v0-fase3`. **Parar.**

### Fase 4 — Multiusuario, auditoría y base de clientes
- [ ] 4.1 Backup. Migración `miembros_y_auditoria` (backfill desde `talleres.user_id`, `es_miembro()`, **políticas nuevas en OR con `talleres.user_id` durante la transición**, `confirmada_por/confirmada_en/cancelada_por/cancelada_en`). La política vieja se retira solo tras probar los dos paneles.
- [ ] 4.2 Edge Functions autorizan por `miembros_taller`. Frontend: `AuthProvider` pasa de `talleres.user_id` a `miembros_taller`; la tarjeta muestra quién y cuándo.
- **Cierre**: `rls-test.sql` con usuario de dos talleres y usuario ajeno; Playwright; tag `v0-fase4`. **Parar.** Después: decidir merge a `main` y despliegue.

## 8. Riesgos y mitigaciones
- Renombrar Edge Functions cambia URLs → registrar redirect URI nueva y actualizar cron antes de borrar las viejas.
- Google en modo Testing → tokens caducan en 7 días → pasar a producción en 0.7 (con scope sensible puede requerir verificación de Google; hasta entonces aviso "app no verificada", funcional).
- Sin Docker → `db dump/diff` pueden fallar → `scripts/backup.mjs`/`pg_dump`; migraciones a mano validadas con `rls-test.sql` y `list_tables`.
- Un solo proyecto Supabase → backup + tag antes de cada migración; datos de prueba nunca se borran (salvo taller `e2e`).
- `.env` sin variables en Vercel rompería el deploy → 0.4 crea las variables antes.
- Abuso de la RPC pública → límites por teléfono en 3.1; Turnstile en roadmap.

## 9. Revisión independiente (workflow, 8 agentes, 19-sep)
Veredicto: "ejecutable con cambios menores". Integrado: FK en `reservas`; conservar grants por columna en la baseline; pertenencia comprobada desde la fase 2; funciones viejas vivas una semana; `verify_jwt` declarado en `config.toml`; recorte de tablas/columnas sin hardcode que sustituir; tests solo de lógica pura; `[db.seed] sql_paths`; `seeds.test.ts` + ESLint; orden de migración a TS; `edgeFunctions` con slugs actuales; CSS muerto explícito; assets comprimidos. Descartado como falso o exagerado: fuga de PII por RLS, `user_id` expuesto a anon, UPDATE sin `WITH CHECK`, Edge Functions invocables con anon key, WhatsApp duplicado al confirmar dos veces (idempotente), inyección de texto libre en WhatsApp (plantilla con parámetros tipados).

## 10. Correcciones respecto a la versión anterior del plan
- La fuga de datos personales por RLS **no existe**: hay grants por columna. Se reclasifica como "inserción directa sin validación" (media).
- Producción en Vercel **es pública**; la protección solo afecta a previews.
- El deploy de producción es del 15-sep (no del 11) y coincide con `origin/main`; el trabajo multi-taller no está desplegado.
- WhatsApp = Meta Cloud API; el código de las funciones se obtiene de Supabase (no está en local).
