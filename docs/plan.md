# Plan CiTaller v3: producto completo, de extremo a extremo

> Cómo se usa: cada paso tiene una casilla. Copia canónica en el repo: `docs/plan.md` (al aprobar este plan se sincroniza allí). Nada se sube a `main` ni se despliega a producción sin tu OK explícito.
>
> **Ritmo acordado el 20-sep-2026**: las fases 2 → 2.5 → 3 se ejecutan encadenadas, sin parar al cierre de cada una. Claude solo se detiene cuando hay una decisión tuya pendiente, cuando un paso solo puedes hacerlo tú (consolas de Google o Meta, `functions deploy`, `secrets set`, `config push`) y, obligatoriamente, **antes de la salida a producción (fase 4)**. La fase 5 (varios empleados por taller) va después de producción. Cada fase sigue teniendo verificación automática (`npm run probar-cadena`), casillas marcadas y etiqueta `v0-faseN`.

## 0. Estado a 20-sep-2026

- **Fases 0 y 1 hechas y etiquetadas** (`v0-fase0`, `v0-fase1`; detalle y casillas en `docs/plan.md`). En la nube: 4 migraciones aplicadas, 6 Edge Functions con nombres propios, tokens de Google cifrados en Vault, cron de recordatorios funcionando, registro público desactivado. Verificación `npm run probar-cadena`: 27/27 sobre el taller de pruebas `e2e` (id 3), incluido un evento real creado y borrado en Google Calendar.
- Rama `reestructuracion`, 21 commits por delante de `main`, sin push. Producción sigue sirviendo el commit del 15-sep (demo de un solo taller que inserta directamente en `reservas`); por eso tres permisos de anon/authenticated quedan sin revocar hasta desplegar el frontend nuevo.
- Google: pantalla de consentimiento en "Prueba" (publicarla exige verificación, política de privacidad y dominio propio). Miguel y la cuenta de Rik and Roll son usuarios de prueba; los permisos caducan cada 7 días (reconectar el taller `e2e` hacia el 27-sep).
- Pendientes menores de la fase 1: borrar los cinco slugs antiguos de Edge Functions desde el dashboard; rotar el secreto del cron.
- **Este plan v3 añade lo que Miguel describió el 20-sep-2026** (sección 1b) sin cambiar ninguna decisión anterior: cita manual desde el panel, WhatsApp de cancelación, cancelación por el cliente con enlace propio, modo de WhatsApp por taller, QR y botón de Google Business Profile.

## 1. Contexto

CiTaller es una app de reserva de citas para talleres (hoy Speedbikes Moto y Rik and Roll), construida pegando código de ChatGPT, sin estructura, sin migraciones y con las integraciones (Google Calendar, WhatsApp de Meta) montadas a mano en la nube de Supabase. Objetivo: que Claude Code tome el control con una estructura limpia y escalable como SaaS multi-taller, todo versionado en el repo, y **que cada flujo funcione de extremo a extremo** (navegador → Supabase → Google/Meta → vuelta) y se pueda verificar.

## 1b. El producto, tal como lo describió Miguel el 20-sep-2026

1. **El cliente** entra por el enlace del taller (Google Business Profile o QR del mostrador), rellena un formulario corto (matrícula, nombre, teléfono, vehículo), elige servicio y, según el servicio, rellena campos propios: en neumáticos, la medida obligatoria con la foto de ayuda; en motos, los kilómetros. Elige fecha y hora según el horario del taller y su capacidad por franja (número de elevadores o mecánicos: "a las 9:30 pueden entrar dos coches"). La solicitud llega al taller como **pendiente**.
2. **El taller** entra en su panel (independiente del resto) y **confirma o cancela**. Al confirmar: WhatsApp al cliente con los datos y evento en su Google Calendar. También **apunta citas a mano** para quien viene en persona (confirmadas directamente, teléfono opcional) y puede **cancelar una cita ya confirmada**, avisando al cliente por WhatsApp.
3. **El cliente puede cancelar su cita por su cuenta** desde un enlace propio, hasta 24 horas antes: se libera el hueco, se borra el evento de Google y el taller lo ve en el panel como cancelada por el cliente (sin WhatsApp al taller).
4. **Promoción**: botón "Reserva tu cita" en el perfil de Google Business de cada taller y un código QR con la URL completa del taller para el mostrador. Dominio propio: más adelante.

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Ritmo (20-sep) | Fases 2 → 2.5 → 3 encadenadas; paradas solo por decisiones, pasos manuales de Miguel o antes de producción. |
| Cita manual del taller (20-sep) | Nace **Confirmada**, teléfono **opcional**; con teléfono se avisa por WhatsApp; siempre va al calendario. El taller puede elegir **cualquier hora**, con aviso si está llena o fuera de horario. |
| Cancelación por el taller (20-sep) | Además de borrar el evento, **WhatsApp de cancelación** al cliente (plantilla nueva). |
| Cancelación por el cliente (20-sep) | Enlace propio de la cita con código largo, **sin comprobación extra**; permitido **hasta 24 h antes**; el taller lo ve en el panel como "cancelada por el cliente"; **sin WhatsApp al taller**. |
| WhatsApp por taller (20-sep) | Modo por taller: `api` (Meta Cloud, automático; Rik and Roll se hará WhatsApp Business), `enlace` (el panel abre WhatsApp con el mensaje ya escrito y el taller lo envía desde su móvil; **Speedbikes**, que usa el número personal de la dueña) o `ninguno`. La web solo promete WhatsApp al cliente si el taller lo envía automáticamente. |
| Promoción (20-sep) | QR por taller generado en el repo (`clientes/<slug>/assets/`); nota de operaciones para el enlace de reserva en Google Business Profile. Requiere las URLs por slug (fase 2). |
| Neumáticos (20-sep) | La "foto" es la **imagen de ayuda** que ya existe (`guia_neumatico.png`, pasa a `imagen_ayuda_url` del servicio); el cliente escribe la medida, obligatoria. El cliente **no** sube fotos (roadmap). |
| Rechazo de pendientes (20-sep) | Si el taller cancela una solicitud que aún estaba Pendiente, el cliente **también** recibe el WhatsApp de cancelación. |
| Recordatorios en modo `enlace` (20-sep) | El panel muestra una lista **"Citas de mañana"** con un botón por cita que abre WhatsApp con el recordatorio ya escrito. El envío automático sigue siendo solo para modo `api`. |
| Salida a producción (20-sep) | **Al cerrar la fase 3**, con tu OK explícito (fase 4). Multiusuario (fase 5) sale después como mejora. |
| Escalado | SaaS multi-tenant. Alta de taller sin tocar código. |
| TypeScript | Sí, durante la reestructuración. |
| Config por taller | Fuente de verdad en BD. En el repo, `clientes/<slug>/` con seed, assets y notas; **sin secretos** (ni tokens, ni refresh_token, ni IDs de WhatsApp). |
| Supabase | Todo al repo con Supabase CLI. **Flujo solo remoto, sin Docker**: migraciones escritas a mano + `db push`; backup antes de cada migración. |
| URLs | `/<slug>`, `/<slug>/panel` y `/<slug>/cita/<token>`; redirección de `?taller=N`. Slugs reservados prohibidos por CHECK. |
| Google | Un proyecto de Google Cloud; cada taller conecta su Calendar. |
| Usuarios | Varios empleados por taller, con registro de quién hace qué. |
| Cliente final | Sin cuenta; identificado por teléfono; gestiona su cita con el enlace de la cita. |
| Producción | Sin clientes reales aún. Se trabaja en la rama `reestructuracion`; `main` y producción no cambian hasta que Miguel apruebe la salida (fase 5). |
| Fechas y horas | `dia date` + `hora time` **en hora local del taller**; solo se convierten en los bordes (Calendar, "mañana" del cron, regla de 24 h). Nunca `new Date("YYYY-MM-DD")`; siempre `lib/fechas`. |
| Estilos | CSS propio en tokens + CSS Modules. Fuera Tailwind y FullCalendar. |
| Tests | Vitest para lógica pura; `scripts/probar-cadena.mjs` (ya existe, 27 comprobaciones) crece con cada flujo nuevo; Playwright smoke en la fase 2; `scripts/rls-test.sql`; `docs/checklist-manual.md`. |
| Alcance mínimo | Solo se crea en BD lo que sustituye un hardcode actual o una decisión cerrada. |
| Roadmap (no ahora) | Panel admin de alta de talleres con interfaz; el cliente **cambia** de hora (solo cancela, de momento); ficha de cliente e historial por matrícula; facturación; Outlook; Turnstile anti-abuso; dominio propio y publicación de la app de Google; staging separado con el primer cliente real. |

## 3. Diagnóstico (lo que sigue pendiente a 20-sep-2026, verificado en el código)

Lo resuelto en las fases 0 y 1 está en `docs/plan.md`. Lo que queda, y que este plan ataca:
- **Lógica por taller en el código**: `ReservaForm.jsx` decide kilómetros/neumáticos con `tallerId === 1/2`; lista de servicios única y fija (7); `FechaHora.jsx` aplica capacidad **por día** al taller 1 y **por hora** al resto, regla triplicada; el trigger de aforo tiene `taller_id = 1` y `6` escritos a mano y corre también en UPDATE (confirmar con 6 activas falla); `configuracion_taller.max_citas_dia` no se usa. La capacidad por hora **no está protegida en la base de datos**: dos clientes pueden coger el mismo hueco.
- **Sin `slug`**: la URL es `?taller=N` con fallback silencioso al taller 1.
- **Cita manual**: "+ Nueva cita" saca al taller al formulario público y la cita nace Pendiente. La base de datos ya permite al taller insertar Confirmada (política de la fase 1); el frontend no lo usa.
- **Cancelación por el taller**: no avisa al cliente; el panel ni carga el teléfono.
- **Cancelación por el cliente**: no existe nada (ni ruta, ni token, ni columna).
- **WhatsApp**: teléfono obligatorio sin validar formato; normalización duplicada en dos funciones; si falla el envío, el taller no se entera (solo consola); `Confirmacion.jsx` promete un WhatsApp que solo llega si el taller tiene la API activa, y dice "¡Solicitud enviada!" antes de guardar.
- **Promoción**: nada de QR ni de Google Business en el repo.

## 4. Cadena end-to-end por flujo (qué debe estar en pie y cómo se comprueba)

| Flujo | Cadena | Verificación (todo en `npm run probar-cadena` salvo lo marcado) |
|---|---|---|
| A. Reservar (público) | `/<slug>` → `talleres_publicos`, `servicios_taller`, `campos_formulario_taller`, `horarios`, `festivos`, RPC `ocupacion_dia` → RPC `crear_reserva_publica` v2 → pantalla con el **enlace de la cita** | reserva válida creada con `datos_extra` y `token_publico`; rechazos: festivo, fuera de horario, hueco lleno, taller inactivo, teléfono mal, más de 3 activas por teléfono |
| B. Login y panel | `/<slug>/panel` → Auth → reservas del taller | ya verificado; se mantiene |
| C. Confirmar | panel → Edge `confirmar-reserva` → estado + `confirmada_por/en` → WhatsApp según `whatsapp_modo` → Calendar | `api`: plantilla enviada o error registrado en la reserva; `enlace`: la función devuelve el texto y el panel abre wa.me; `ninguno`: nada; evento creado (ya verificado) |
| D. Cancelar (taller) | panel → Edge `cancelar-reserva` → estado + `cancelada_por='taller'` → WhatsApp de cancelación según modo → borrar evento (mejor esfuerzo) | igual que C con la plantilla `cancelacion_cita` |
| E. Conectar Calendar | ya verificado; se mantiene | |
| F. Recordatorios | cron → Edge; **envía solo en modo `api`**. En modo `enlace`, lista "Citas de mañana" en el panel con botón de WhatsApp por cita | ya verificado; se añade la comprobación del modo; Vitest para el texto del recordatorio |
| **G. Cita manual** | panel → formulario propio → Edge `crear-reserva-taller` (Confirmada, `creada_por='taller'`, teléfono opcional, cualquier hora con aviso) → misma orquestación que C | cita creada Confirmada con y sin teléfono; con hora llena se crea igual; evento en Calendar |
| **H. Cancelación por el cliente** | WhatsApp o pantalla de confirmación → `/<slug>/cita/<token>` → RPC `cita_por_token` (datos mínimos) → Edge `cancelar-cita-cliente` → estado + `cancelada_por='cliente'` → borrar evento (mejor esfuerzo) | dentro de plazo: cancela y limpia el evento; a menos de 24 h: rechazada con mensaje; token inventado o ya usado: rechazado; el panel muestra "Cancelada por el cliente" |
| **I. Promoción** | `clientes/<slug>/assets/qr-reserva.{svg,png}` → URL `/<slug>`; enlace de reserva en Google Business Profile | el QR decodifica a la URL exacta (test); manual: el botón del perfil abre el formulario del taller |
| J. Deploy | rama → preview Vercel → `main` → producción | smoke en preview antes de aprobar el merge (fase 5) |

## 5. Estructura objetivo

```
citaller/
├── CLAUDE.md · README.md · .env.example · vercel.json
├── docs/  idea.md · plan.md · arquitectura.md · integraciones.md · operaciones.md · checklist-manual.md · rls-baseline.md
├── clientes/  README.md · _plantilla/ · speedbikes/{seed.sql,assets/,README.md} · rikandroll/{...} · e2e/{seed.sql}
│              assets/ incluye qr-reserva.svg y qr-reserva.png generados por scripts/qr.mjs
├── supabase/  config.toml · migrations/ · functions/
│   └── functions/ _shared/{http,supabaseAdmin,autorizar,google,tokensCalendario,origenes}.ts (existen)
│                  _shared/{whatsapp,reservas,fechas}.ts (nuevos)
│                  conectar-google-calendar · google-calendar-callback · crear-evento-google · cancelar-evento-google (existen)
│                  confirmar-reserva · cancelar-reserva · crear-reserva-taller · cancelar-cita-cliente (nuevas, fase 3)
│                  enviar-whatsapp-confirmacion · enviar-whatsapp-recordatorios (existen; en la fase 3 pasan a usar _shared/whatsapp.ts)
├── scripts/  backup.mjs · rls-test.sql · probar-cadena.mjs (existen) · qr.mjs · sync-clientes.mjs (nuevos)
├── tests/e2e/  reservar.spec.ts · panel.spec.ts · cita-cliente.spec.ts (Playwright)
└── src/
    ├── main.tsx · app/{App,router}.tsx · app/providers/{TallerProvider,AuthProvider}.tsx
    ├── config/env.ts · lib/supabase/{client,database.types}.ts · lib/fechas.ts
    ├── features/taller/ (api, TallerConfig, useTaller) · features/reservar/ (ReservarPage, pasos/, useReservaWizard, disponibilidad.ts, validacion.ts, api)
    ├── features/cita/ (CitaClientePage: ver y cancelar por token)
    ├── features/panel/ (PanelPage, LoginPage, componentes/, NuevaCitaForm, useReservasTaller, filtros.ts, whatsappEnlace.ts, api)
    ├── features/integraciones/ (edgeFunctions.ts, ConectarCalendar)
    ├── components/ (CampoInput, Boton, Alerta, Modal, Cargando, Layout) · styles/{tokens,base}.css + *.module.css · assets/
```

## 6. Modelo de configuración por taller y de reservas (BD)

### Ya existe (fase 1)
`talleres_publicos`, `ocupacion_dia`, FK y CHECK de `reservas`, Vault para tokens, políticas por taller.

### Fase 2b: `talleres.slug`
`slug text unique`, CHECK `^[a-z0-9-]{3,40}$` y no en (`panel`,`login`,`admin`,`api`,`cita`,`clientes`,`assets`,`e2e`); backfill `speedbikes`, `rikandroll`, `e2e`. La vista `talleres_publicos` lo expone; RPC `taller_por_slug(slug)` o simplemente `talleres_publicos?slug=eq.`.

### Fase 3.1: configuración por taller
| Hoy (código) | Mañana (BD) |
|---|---|
| Kilómetros solo taller 1 | `campos_formulario_taller (id, taller_id, servicio_id null=todos, clave, etiqueta, tipo numero/texto/select, opciones jsonb, obligatorio, orden, unidad, ayuda, imagen_ayuda_url)`; valor en `reservas.datos_extra jsonb` |
| Neumáticos taller 2 | `servicios_taller (id, taller_id, nombre, orden, activo, descripcion_modo oculta/opcional/obligatoria, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda, imagen_ayuda_url)` + campo `cantidad_neumaticos` (select 1-4) y `medidas` (texto obligatorio) ligados al servicio |
| Catálogo fijo | `servicios_taller` (seed reproduce los 7 actuales por taller); `reservas.servicio_id` (FK) además del texto `servicio` |
| Capacidad por día (taller 1) vs por hora | `talleres.modo_capacidad ('por_hora'\|'por_dia')` + `talleres.capacidad`; trigger **genérico** `comprobar_capacidad` (sustituye al de taller 1: lee del taller, solo en INSERT y en el paso a Confirmada, con `pg_advisory_xact_lock(taller_id, dia)`); `configuracion_taller` se elimina |
| Aviso de tarde fijo | `talleres.texto_aviso_tarde` |
| Textos "WhatsApp" en la confirmación | `talleres.whatsapp_modo ('api'\|'enlace'\|'ninguno')` default `ninguno`; `talleres.texto_confirmacion` nullable |
| Google solo 1 y 2 | existencia de `integraciones_calendario.conectado` (hecho en la fase 1) |

**Teléfono, una sola normalización, en la base de datos**: función `normalizar_telefono(text)` (solo dígitos; 9 cifras → `34` delante; vacío → null) aplicada por trigger `before insert or update of telefono` en `reservas` (cubre también al frontend viejo de producción) + backfill; `CHECK (telefono is null or telefono ~ '^[0-9]{9,15}$')`. Las Edge Functions dejan de normalizar (hoy hay dos copias).

**Trigger de capacidad `comprobar_capacidad`** (sustituye al de taller 1; SECURITY DEFINER, `search_path=''`, sin EXECUTE para anon/authenticated): solo cuenta cuando la fila queda en Pendiente/Confirmada; **confirmar no consume hueco** (si `old.estado` ya era activo y no cambian `dia`/`hora`, no recuenta: hoy confirmar la sexta cita de Speedbikes falla); bloqueo `pg_advisory_xact_lock` por `(taller, día)` para que dos clientes no cojan el mismo hueco; `por_dia` cuenta el día, `por_hora` la hora; **no se aplica a `creada_por='taller'`** (decisión: el taller elige cualquier hora, el panel solo avisa). Error con `errcode` de dominio (`CT001`).

**Trigger `registrar_cambio_estado`**: al pasar a Confirmada rellena `confirmada_en`; al pasar a Cancelada rellena `cancelada_en` y `cancelada_por = coalesce(new.cancelada_por, 'taller')`. Así cualquier UPDATE deja rastro, venga del panel o de una función.

`crear_reserva_publica` **v2** (SECURITY DEFINER, `search_path=''`): usa `validar_datos_reserva(...)` (interna) que comprueba taller activo, servicio activo del taller, `descripcion` según `descripcion_modo`, día no festivo, `(dow, hora)` en `horarios_taller`, fecha futura (`Europe/Madrid`), teléfono normalizado válido, matrícula, `datos_extra` contra `campos_formulario_taller` (claves, obligatorios, tipos, opciones); además **límite por teléfono** (máx. 3 activas por taller y 5 creaciones por día). Errores con `errcode` `CTxxx` que el frontend traduce (`src/lib/erroresDominio.ts`). Devuelve `{reserva_id, token_publico}`. `insertar_reserva_taller(...)` (solo `service_role`) aplica las mismas reglas menos: teléfono opcional, sin límites por teléfono, hora pasada de hoy permitida y sin capacidad. `ocupacion_dia` limita `p_dia` a `[hoy, hoy + 90 días]`.

### Fase 3.4 y 3.5: citas manuales y cancelaciones
- `reservas.token_publico uuid not null default gen_random_uuid() unique` (backfill para las existentes); es la credencial del enlace `/<slug>/cita/<token>`. Nunca la lee anon por REST: solo la RPC `cita_por_token` y la Edge `cancelar-cita-cliente`.
- `reservas.creada_por text not null default 'cliente' check in ('cliente','taller')`; `reservas.cancelada_por text check in ('cliente','taller')`; `reservas.cancelada_en timestamptz`; `reservas.confirmada_en timestamptz` (en la fase 4 se añade `confirmada_por uuid` y `cancelada_por_usuario uuid`).
- Teléfono opcional solo en manuales: CHECK `(creada_por = 'taller' or telefono is not null)`.
- Aviso al taller de fallos de mensajería: `reservas.whatsapp_ultimo_error text`, `reservas.whatsapp_cancelacion_enviada boolean default false`, `whatsapp_cancelacion_fecha`.
- RPC `consultar_cita_cliente(p_token uuid)` (SECURITY DEFINER, anon): devuelve solo `taller_nombre, taller_slug, taller_telefono, nombre, vehiculo, matricula, servicio, dia, hora, estado, cancelada_por, puede_cancelar, limite_cancelacion`. **Nunca el teléfono del cliente.** `puede_cancelar` = estado en (Pendiente, Confirmada) y `dia+hora` en `Europe/Madrid` ≥ ahora + 24 h. La regla de 24 h es una constante de la función (no una columna por taller mientras nadie pida otro plazo).
- Función `cancelar_reserva_cliente(p_token uuid)` (SECURITY DEFINER, **solo `service_role`**): `select … for update`; no existe → `CT010`; ya cancelada → `CT012`; fuera de plazo → `CT011`; si no, `estado='Cancelada', cancelada_por='cliente'`. La llama la Edge `cancelar-cita-cliente`, que después borra el evento de Google a mejor esfuerzo.
- Índices: parcial `(taller_id, dia, hora) where estado in ('Pendiente','Confirmada')` y `(taller_id, telefono)` con el mismo filtro.
- Migración "de despliegue" (fase 5): además de las tres revocaciones pendientes, revocar a `authenticated` el INSERT y el UPDATE directos en `reservas` (desde 3.3 el panel escribe solo por Edge Functions) y borrar `capacidad_simultanea`, `kilometros`, `whatsapp_activo`, `configuracion_taller` y la sobrecarga vieja de la RPC.

## 7. Fases

### Fase 0 — Accesos, línea base y documentación (sin cambiar comportamiento)
- [x] 0.1 Commit en `main` del trabajo sin commitear ("Baseline estable pre-reestructuración"), **sin push**. Rama `reestructuracion`. Tag `v0-baseline`. *(hecho, ver sección 0)*
- [x] 0.2 Commit con `.gitattributes` (`* text=auto eol=lf`). Commit borrando `citaller/citaller/`. *(hecho)*
- [x] 0.3 Docs (`idea`, `arquitectura`, `integraciones`, `operaciones`, `checklist-manual`, `plan`), `CLAUDE.md`, `README.md`, `.env.example`, `.vscode/` (Deno). Commit `a537999`.
- [x] 0.4 Variables en Vercel creadas; `src/config/env.js` + `.env.local` + `vercel.json` + `.gitignore`; build verificado. Commit `ddf0b14`.
- [x] 0.5a CLIs instaladas: Supabase CLI 2.117 (devDependency, commit `f4ec8aa`), Vercel CLI 59 (global), Google Cloud SDK 585 y Deno (winget).
- [x] 0.5b Logins: Supabase (token) y proyecto vinculado; Google (`miguel.rodriguez.sevilla93@gmail.com`, proyecto `citaller-508917`, Calendar API habilitada); Vercel (`vercel login` + `vercel link`, cuenta personal). **La contraseña de la base de datos no hace falta para `db push` ni `migration repair`** (la CLI va por la API con el token; verificado con `db push --dry-run`); solo la usa `npm run backup` y está en `.env.local`.
- [x] 0.6a `npx supabase init` hecho (commit `161eb5c`). 6 Edge Functions descargadas y registradas en `config.toml` con su `verify_jwt` actual; tipos generados en `src/lib/supabase/database.types.ts` (commit `9a722c5`). Secretos listados: **falta `CITALLER_APP_URL`** (el callback de Google redirige a localhost en producción) → crear en la fase 1.3.
- [x] 0.6b Backup hecho con `npm run backup` → `backups/2026-09-19_2007/` (7 tablas: 2 talleres, 16 reservas, 74 horarios, 28 festivos, 1 integración, 4 states, 1 configuración; carpeta ignorada por git). Baseline `20260919210000` marcada como aplicada con `migration repair`; `migration list` muestra local = remoto.
- [x] 0.8 `scripts/rls-test.sql` ejecutado: línea base en `docs/rls-baseline.md` (16/24 en objetivo; los 8 restantes son trabajo de la fase 1).
- [x] 0.5 Consolidado en 0.5a y 0.5b.
- [x] 0.6 Supabase al repo: hecho en 0.6a y 0.6b. Además: `config.toml` con `[db.seed] sql_paths = ["../clientes/*/seed.sql"]` (dry-run OK; avisa de que aún no hay seeds) y sección `[auth]` con los valores objetivo (`enable_signup=false`, `site_url` de producción) **sin ejecutar `config push`** hasta la fase 1.4 (nota en `operaciones.md`). `src/features/integraciones/edgeFunctions.js` centraliza los 4 slugs que invoca el panel (`PanelTaller.jsx` ya no tiene literales). Build OK; lint igual que la línea base (4 errores, 3 avisos).
- [x] 0.7 Google Cloud: Calendar API habilitada (`gcloud`). Pantalla de consentimiento **en "Testing"** (comprobado por Miguel el 19-sep): los tokens caducan a los 7 días y solo conectan usuarios de prueba; documentado en `integraciones.md` con los pasos para publicarla. **Acción pendiente de Miguel antes de la fase 1.3: pulsar "Publish app"** y confirmar la redirect URI del cliente OAuth en la consola.
- [x] 0.8b `scripts/rls-test.sql` repetido al cierre de la fase 0 (19-sep, tras `migration repair`): 16/24 en objetivo, pendientes 6, 12, 13, 14, 18, 19, 23, 24. Idéntico a `docs/rls-baseline.md`: la fase 0 no ha cambiado ningún permiso.
- **Cierre**: build y lint como en la línea base; `git status` limpio en la rama; `migration list` con la baseline; 6 funciones en el repo; tag `v0-fase0`. **Parar y pedir aprobación.** *(Hecho el 19-sep-2026: build OK, lint 4 errores y 3 avisos como en la línea base, `migration list` local = remoto, 6 funciones en el repo, rls-test 16/24 idéntico. Verificación independiente de la baseline contra la nube con 7 agentes: 2 correcciones aplicadas al fichero (`valoracion numeric(2,1)` y `revoke execute ... from public` + grants de columna históricos), 1 hallazgo refutado (esquema de pg_cron: supautils lo fuerza a pg_catalog), `config.toml` y `database.types.ts` sin diferencias. Tag `v0-fase0`.)*

### Fase 1 — Arreglar y asegurar la cadena en Supabase (aditivo primero)
- [x] 1.1 Backup (`backups/2026-09-19_2029/`). Migración `20260919220000_integridad_y_seguridad.sql` aplicada: FK `reservas.taller_id` (ON DELETE RESTRICT), CHECK de `estado`, `taller_id/dia/hora/estado` NOT NULL, índice `(taller_id, dia)`, vista `talleres_publicos`, RPC `ocupacion_dia`, privilegios de anon y authenticated revocados en las tres tablas internas, `authenticated` limitado a la fila de su taller, y política UPDATE con regla de transición (solo Pendiente/Confirmada → Confirmada/Cancelada). El frontend de la rama ya usa la vista y la RPC. **El revoke del INSERT y del SELECT directos de anon queda para el despliegue** (ver más abajo).
- [x] 1.2 Recordatorios arreglados. `enviar-whatsapp-recordatorios` desplegada con `verify_jwt=false`; secreto en Vault (`citaller_cron_secret`) y job `citaller-recordatorios-whatsapp` creado por la migración `20260919220200`. Verificado el 20-sep: invocación manual **200**, con 5 recordatorios detectados para el día siguiente y ninguno enviado (WhatsApp inactivo en los dos talleres); sin la cabecera del secreto responde 401. El job de las 08:00 UTC del 20-sep dio 404 porque la función aún no estaba desplegada; la siguiente ejecución ya la encuentra.
- [x] 1.3 Google rehecho. `_shared/{http,supabaseAdmin,autorizar,google,tokensCalendario,origenes}.ts`; `conectar-google-calendar` nueva (comprueba pertenencia y crea un `state` de un solo uso de 10 minutos con la URL de vuelta validada contra una lista de orígenes); `google-calendar-callback` guarda el refresh token cifrado en Vault; `crear-evento-google` y `cancelar-evento-google` leen de Vault, con respaldo en la columna antigua durante la transición; secretos `CITALLER_APP_URL` y `GOOGLE_REDIRECT_URI` creados. Las 6 funciones desplegadas y probadas sin sesión (401 y 400 correctos). Ciclo completo verificado el 20-sep-2026 sobre el taller de pruebas `e2e`: consentimiento de Google dado en el navegador, refresh token guardado **cifrado en Vault** (la columna en claro queda a null), evento creado y borrado de verdad en Google Calendar. **Pendiente**: borrar los cinco slugs antiguos desde el dashboard y rotar el secreto del cron. La pantalla de consentimiento se queda en "Prueba" (publicarla exige verificación de Google, política de privacidad y dominio propio): los tokens caducan cada 7 días y hay que reconectar.
- [x] 1.4 `set search_path` fijo en el trigger y en las funciones nuevas; `(select auth.uid())` en las políticas; registro público desactivado con `supabase config push` (junto con `site_url` y las URLs de redirección al dominio de producción). Contraseñas filtradas: **no se puede activar**, requiere plan Pro; queda documentado en `operaciones.md` como aviso aceptado.
- **Revisión independiente de la fase 1** (4 revisores + refutación, 19-sep). Corregido ya en `20260919230000_correcciones_revision_fase1.sql` y en el panel: (a) el trigger de capacidad era SECURITY INVOKER y leía `reservas.id`, que anon no puede leer → **las reservas directas del taller 1 estaban rotas en producción desde que se pusieron los grants por columna**; ahora es SECURITY DEFINER; (b) la vista `talleres_publicos` con `security_invoker` necesitaba `grant select (activo)` o devolvía 401 a la página pública; (c) un taller con `activo=false` se podía leer saltándose la vista → política de anon en `talleres` ahora exige `activo`; (d) el panel no comprobaba las filas afectadas del UPDATE, así que con la regla de transición nueva una cita cancelada disparaba WhatsApp y Calendar sin cambiar nada; ahora usa `.select("id")` y avisa.
- **Hallazgos aceptados o aplazados** (de la misma revisión): rotar el secreto del cron (sigue en claro en el histórico `cron.job_run_details`, solo visible con acceso de dueño del proyecto); endurecer `crear_reserva_publica` (valida taller activo, horario, festivo, capacidad y límites por teléfono) → es la fase 3.1 tal como estaba previsto; limitar la ventana de fechas de `ocupacion_dia` (hoy permite consultar ocupación agregada de cualquier día); aviso 0028 del linter sobre las RPC públicas SECURITY DEFINER (aceptado: son la superficie pública por diseño); migraciones sin `if exists`/`or replace` (solo molesta al reproducir el esquema en un proyecto nuevo).
- **Pendiente del despliegue** (no se puede hacer en la fase 1): producción sirve todavía el commit del 15-sep, una demo de un taller que **inserta directamente en `reservas` como anon** y **lee `(dia, hora, estado)` de esa tabla**; y `LoginTaller.jsx` comprueba la pertenencia leyendo `talleres.user_id`. Por eso quedan para la migración que acompañe al despliegue del frontend nuevo: revocar el INSERT directo de anon en `reservas` (solo RPC), revocar su SELECT por columnas (solo `ocupacion_dia`) y quitar a `authenticated` la lectura de `talleres.user_id`. Son las comprobaciones 31, 32 y 33 de `scripts/rls-test.sql`, marcadas "(despliegue)".
- **Avisos del linter aceptados**: las tres RPC SECURITY DEFINER visibles para anon (`crear_reserva_publica` y `ocupacion_dia` son la superficie pública por diseño; `comprobar_limite_citas_dia` es una función de trigger que no se puede invocar por REST, el aviso es cosmético y revocarle EXECUTE se probará con el taller `e2e` en la fase 2); las contraseñas filtradas (requiere plan Pro); y `rls_enabled_no_policy` (INFO) en las tres tablas internas, que ya solo tienen privilegios para `service_role`.
- [x] **Cierre (20-sep-2026)**: `get_advisors` sin WARN nuevo más allá de los aceptados; `rls-test.sql` 32/35 (las tres "(despliegue)" siguen pendientes por diseño); flujos A, B, C, D, E y F verificados con `npm run probar-cadena` (27/27) sobre el taller `e2e`, incluido el evento real de Google; build y lint como en la línea base. Tag `v0-fase1`. **Parado, esperando aprobación de la fase 2.**

### Fase 2 — Reestructurar el frontend con comportamiento idéntico (un commit por subfase, app funcionando)
- [ ] 2a Tooling: `tsconfig` (strict, `allowJs`), `vite.config.ts`, Vitest, ESLint TS, CSS Modules; quitar tailwind y fullcalendar; Playwright con `tests/e2e/` usando el taller `e2e` y las credenciales de `.env.local`.
- [ ] 2b `lib/supabase/client.ts` (cliente público + autenticado, `detectSessionInUrl: false`), `config/env.ts`, `lib/fechas.ts` (+tests). Migración `slug` (backfill `speedbikes`, `rikandroll`, `e2e`). Router + `TallerProvider` + `AuthProvider` con la comprobación de pertenencia que hoy hace `LoginTaller.jsx` + redirección `?taller=N[&modo=taller]` (conservando `calendar=…`); slug desconocido → 404. Ruta `/<slug>/cita/<token>` reservada (página "próximamente" hasta la 3.5). Orden de migración a TS: `CampoInput → Confirmacion → LoginTaller → FechaHora → ReservaForm → PanelTaller`.
- [ ] 2c `features/reservar`: `useReservaWizard`, `disponibilidad.ts` puro (+tests, incluido cruce de medianoche y modo por día/por hora), páginas. La lógica por taller se concentra en `features/taller/configTemporal.ts` (único sitio con `1`/`2`).
- [ ] 2d `features/panel`: hooks + componentes; `filtros.ts` (+tests); `Modal`/`Alerta` en vez de `alert`/`confirm`.
- [ ] 2e Estilos: `tokens.css`, `base.css`, módulos; fuera `index.css` de plantilla, los `!important` y los bloques inline; CSS muerto borrado; `lang="es"`; `logo.png` y `guia_neumatico.png` comprimidos.
- **Cierre**: lint 0 errores, tests en verde, Playwright en verde en local y contra el preview de Vercel; `probar-cadena` 27/27; `grep "=== 1\|=== 2" src/` solo en `configTemporal.ts`; tag `v0-fase2`. Se continúa sin parar.

### Fase 2.5 — Correcciones de comportamiento
- [ ] Paso 3 pasa a `Resumen` + pantalla `ReservaConfirmada` **solo tras guardar**; botón bloqueado mientras guarda; la pantalla final muestra el **enlace de la cita** (`/<slug>/cita/<token>`) con "guárdalo para cancelar si no puedes venir".
- [ ] `useDisponibilidad`: una sola bandera de carga, cancelación de peticiones obsoletas, reset en error.
- [ ] Panel: fuera el filtro de fin de semana, `[tallerId]` en efectos, `TarjetaReserva` fuera del componente, acciones deshabilitadas en pasadas y durante la operación, contador coherente, "hoy" se recalcula, `valoracion` 0 no se oculta; **carga y muestra el teléfono**; **aviso visible cuando un WhatsApp o Calendar falla** (hoy solo consola).
- [ ] Sesión: usuario derivado de cada evento de `onAuthStateChange`.
- [ ] Al cambiar de servicio se limpian campos dependientes. `validacion.ts` con formato de teléfono (`[67]` + 8 dígitos tras normalizar) y matrícula. Errores de dominio traducidos.
- **Cierre**: tests por corrección; Playwright en verde; tag `v0-fase2.5`. Se continúa.

### Fase 3 — Configuración por taller en BD, orquestación en servidor y los flujos nuevos
- [ ] 3.1 Backup. Migración `config_taller` (sección 6): `servicios_taller`, `campos_formulario_taller`, `reservas.datos_extra` + `servicio_id`, `modo_capacidad` + `capacidad`, trigger genérico con bloqueo (adiós al de taller 1 y a `configuracion_taller`), `whatsapp_modo`, textos; `crear_reserva_publica` v2 con `token_publico`. Seeds `clientes/speedbikes` (motos, kilómetros, por día 6, `whatsapp_modo='enlace'`), `clientes/rikandroll` (neumáticos, por hora 2, `api` cuando esté dado de alta), `clientes/e2e`, `_plantilla`. `scripts/sync-clientes.mjs` (assets → `public/clientes/<slug>/`). Garantías: `seeds.test.ts` (cada seed falla si menciona otro slug) y ESLint `no-restricted-imports` (nada en `src/` importa de `clientes/`).
- [ ] 3.2 Frontend dinámico: `TallerConfig` desde BD; servicios y campos extra por servicio (con imagen de ayuda y obligatorios); capacidad según modo; resumen y tarjeta iteran campos; textos de confirmación según `whatsapp_modo` (solo promete WhatsApp en `api`); borrar `configTemporal.ts`.
- [ ] 3.3 Edge de orquestación. `_shared/whatsapp.ts` (cliente de Meta, plantillas `confirmacion_cita_v2` con botón de URL al enlace de la cita, `cancelacion_cita`, `recordatorio_cita`; `formatearDiaLargo` para no mandar la fecha en ISO; token por taller desde Vault como los de Google), `_shared/calendario.ts` (crear/borrar evento de una reserva, descripción con `datos_extra` etiquetados), `_shared/reservas.ts` (reserva + taller + autorización), `_shared/enlaces.ts` (`urlCitaCliente(slug, token)`), `_shared/notificar.ts` (`trasConfirmar`: WhatsApp según `whatsapp_modo` y Calendar si conectado, devolviendo `{whatsapp: {modo, enviado, motivo}, calendario: {creado, error}}` y registrando `whatsapp_error`/`google_error`). `confirmar-reserva` (JWT): Confirmada si estaba Pendiente; si ya lo estaba, reintenta las notificaciones pendientes (así "reintentar" es volver a pulsar). `cancelar-reserva` (JWT): Cancelada con `cancelada_por='taller'`; WhatsApp de cancelación según modo **tanto si venía de Confirmada como de Pendiente** (idempotente por `whatsapp_cancelacion_enviada`) y, si tenía evento, borrado a mejor esfuerzo. El panel en modo `enlace` añade además la vista **"Citas de mañana"** (confirmadas del día siguiente con teléfono) con un botón por cita que abre el recordatorio ya escrito. En modo `enlace` las funciones no llaman a Meta: el panel construye `https://wa.me/<telefono>?text=…` (`features/panel/textosWhatsapp.ts`, con marcadores `{nombre} {taller} {dia} {hora} {vehiculo} {servicio} {matricula} {enlace_cita}` y textos por taller opcionales) y muestra "Avisar por WhatsApp". Recordatorios solo en modo `api`. El panel llama a **una** función por acción y enseña un modal de resultado ("WhatsApp enviado", "no enviado: sin teléfono", "Meta rechazó el envío", "Google: conexión caducada") con botón Reintentar. `enviar-whatsapp-confirmacion`, `crear-evento-google` y `cancelar-evento-google` pasan a ser módulos internos y se borran de la nube una semana después de desplegar.
- [ ] 3.4 **Cita manual**: `NuevaCitaForm` dentro del panel (mismos campos que el público, servicio del taller, teléfono opcional, selector de día/hora libre con aviso "hora llena" o "fuera de horario" pero sin bloquear); Edge `crear-reserva-taller` (JWT): inserta Confirmada con `creada_por='taller'` (el trigger de capacidad no se aplica a `creada_por='taller'`) y encadena la misma orquestación que `confirmar-reserva` (WhatsApp solo si hay teléfono; Calendar siempre).
- [ ] 3.5 **Cancelación por el cliente**: migración (`token_publico`, `creada_por`, `cancelada_por/en`, `confirmada_en`, columnas de WhatsApp de cancelación, RPC `cita_por_token`); página `/<slug>/cita/<token>` (datos de la cita, botón "Cancelar mi cita" con confirmación, mensaje "ya no se puede cancelar por internet, llama al taller: <teléfono>" cuando faltan menos de 24 h o el estado no lo permite); Edge `cancelar-cita-cliente` (`verify_jwt=false`, autoriza por token, aplica la regla de 24 h en `Europe/Madrid`, marca `cancelada_por='cliente'`, borra el evento a mejor esfuerzo, **no** avisa al taller por WhatsApp); el panel etiqueta "Cancelada por el cliente". El WhatsApp de confirmación en modo `api` lleva el enlace como **botón de URL** de la plantilla (parámetro dinámico = token); en modo `enlace`, el texto prellenado lo incluye.
- [ ] 3.6 **Promoción**: `scripts/qr.mjs` (dependencia `qrcode`) genera `clientes/<slug>/assets/qr-reserva.svg` y `.png` con `https://citaller.vercel.app/<slug>` (o `CITALLER_APP_URL`), y `docs/operaciones.md` explica cómo poner el enlace de reserva en Google Business Profile y cómo imprimir el QR. Test: el PNG decodifica a la URL exacta.
- [ ] 3.7 Prueba de escalado: alta de un cuarto taller solo con `_plantilla` + seed; reservar, panel, cita manual y cancelación por cliente sin tocar código; borrarlo.
- **Cierre**: `grep "=== 1\|=== 2" src/` vacío; `probar-cadena` ampliado (A con rechazos y concurrencia, C/D según modo, G, H con sus tres casos, I); Playwright y checklist en los tres talleres; `rls-test.sql` en verde; revisión independiente de las migraciones antes de aplicarlas; tag `v0-fase3`. **Parar: lo siguiente es producción y necesita tu OK.**

### Fase 4 — Salida a producción (solo con tu OK explícito)
- [ ] 4.1 Migración `cierre_permisos_publicos` (las tres comprobaciones "(despliegue)" de `rls-test.sql` más las revocaciones a `authenticated` y las columnas obsoletas de la sección 6), preparada pero **aplicada después** del despliegue del frontend.
- [ ] 4.2 Preview de Vercel de la rama: Playwright y checklist completos. Merge a `main` → producción. Aplicar 4.1. Comprobar que `citaller.vercel.app/speedbikes` y `/rikandroll` reservan, que `?taller=1` redirige y que un enlace `/rikandroll/cita/<token>` abre la cita.
- [ ] 4.3 Pasos manuales guiados: borrar los cinco slugs antiguos de Edge Functions; rotar el secreto del cron; poner el enlace de reserva en Google Business Profile de cada taller; imprimir los QR; dar de alta WhatsApp Business de Rik and Roll en Meta (número, token permanente a Vault, plantillas `confirmacion_cita_v2` con botón de URL, `cancelacion_cita` y `recordatorio_cita` en español) y activar `whatsapp_modo='api'` con una cita de prueba real; Speedbikes en `enlace`.
- **Cierre**: tag `v1`. Vigilancia la primera semana: `net._http_response` del cron, errores de WhatsApp y Google en el panel, caducidad de tokens de Google (7 días mientras la app esté en "Prueba").

### Fase 5 — Multiusuario y auditoría (después de producción)
- [ ] 5.1 Backup. Migración `miembros_y_auditoria`: `miembros_taller (user_id, taller_id, rol, nombre, activo)` con backfill desde `talleres.user_id`; `es_miembro()`; políticas nuevas en OR con `talleres.user_id` durante la transición; `reservas.confirmada_por_usuario uuid`, `cancelada_por_usuario uuid`, `creada_por_usuario uuid`. La política vieja se retira tras probar los tres paneles.
- [ ] 5.2 Edge Functions autorizan por `miembros_taller` (`_shared/autorizar.ts` es el único sitio a cambiar); `AuthProvider` pasa a `miembros_taller`; la tarjeta muestra quién confirmó, canceló o creó la cita y cuándo (y "el cliente" cuando `cancelada_por='cliente'`).
- **Cierre**: `rls-test.sql` con usuario de dos talleres y usuario ajeno; `probar-cadena`; tag `v0-fase5`; despliegue a producción con tu OK.

## 8. Riesgos y mitigaciones
- **Plantillas de Meta**: Meta no permite editar una plantilla aprobada, así que la confirmación con botón de URL es una plantilla nueva (`confirmacion_cita_v2`) y la de cancelación otra; ambas necesitan aprobación (horas o días) y el botón queda ligado al dominio `citaller.vercel.app` (con dominio propio habrá que crear plantillas nuevas; los QR impresos siguen valiendo porque las URLs de Vercel no se retiran). Se preparan en la fase 3 y se dan de alta en la 5.3; mientras, el modo `enlace` funciona sin aprobación.
- **Verificación con WhatsApp real**: hasta que exista la cuenta de Meta de Rik and Roll, el envío automático solo se prueba con el taller `e2e` en modos `ninguno` y `enlace`; el primer mensaje real se hará en la fase 5 con una cita de prueba de Rik and Roll.
- **Modo `enlace`** depende de que la persona del taller pulse enviar. El panel deja claro que el mensaje no se ha enviado hasta que lo haga (estado "pendiente de enviar" en la tarjeta).
- **Enlace de la cita reenviado**: quien tenga el enlace puede cancelar (decisión: sin comprobación extra). Mitigación: el token es un uuid, la RPC solo devuelve datos mínimos y la página no muestra el teléfono del cliente.
- **Regla de 24 h**: se calcula en la base de datos y en la Edge con la zona `Europe/Madrid`, nunca en el navegador.
- **Trigger de capacidad genérico** cambia comportamiento en el paso a Confirmada (hoy falla si el día está lleno en el taller 1): se documenta y `probar-cadena` lo cubre.
- **Google en "Prueba"**: reconectar cada 7 días; la página de operaciones lleva el recordatorio y el panel avisa cuando `crear-evento-google` devuelve "conexión caducada".
- **Sin Docker**: migraciones a mano validadas con `rls-test.sql`, `probar-cadena` y una revisión independiente antes de aplicar las de la fase 3 (como en la fase 1).
- **Producción compartida**: cada fase con backup + tag; los datos de Speedbikes y Rik and Roll no se tocan; todo se prueba con `e2e` y con el taller de escalado de 3.7.

## 9. Revisiones independientes
- Plan v2 (19-sep, 8 agentes): "ejecutable con cambios menores", integrados.
- Fase 1 (19-sep, 4 lentes + refutación): 4 correcciones aplicadas (trigger SECURITY DEFINER, grant `activo`, política de talleres activos, panel comprueba filas afectadas); resto aceptado o aplazado a la 3.1 (`crear_reserva_publica` v2).
- Antes de aplicar las migraciones de la fase 3 se repite el mismo esquema de revisión (corrección SQL, seguridad, compatibilidad, Edge Functions).
