# Integraciones

## Supabase
- Proyecto: `CiTaller` (`zrrqqqbgwwovmglhqxwn`, eu-west-3). URL: `https://zrrqqqbgwwovmglhqxwn.supabase.co`.
- Clave publicable (anon): en `.env.local` y en las variables de Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Se expone al navegador por diseño; la seguridad la dan RLS y los grants por columna.
- CLI: `npx supabase login` (token de acceso personal, que la CLI guarda fuera del repo) y `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn`. Con eso, `migration list`, `migration repair`, `db push`, `functions deploy`, `secrets list` y `gen types` trabajan por la API de gestión: **no necesitan la contraseña de la base de datos** (verificado el 19-sep-2026 con `db push --dry-run`). La contraseña solo la usa `npm run backup` (conexión directa por el pooler). Si el token de acceso se ha compartido por chat o captura de pantalla, revocarlo en https://supabase.com/dashboard/account/tokens y repetir `login`.
- Migraciones: `supabase/migrations/20260919210000_baseline.sql` reproduce el esquema que había en la nube y está **marcada como aplicada** con `migration repair` (no se ejecutó en la nube). Todo cambio posterior es una migración nueva aplicada con `db push`.
- Secretos de Edge Functions existentes el 19-sep-2026 (`npx supabase secrets list`, solo nombres): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CITALLER_CRON_SECRET`, más los automáticos `SUPABASE_*`. **Faltan**: `CITALLER_APP_URL` (necesario para el callback de Google) y `WHATSAPP_TOKEN_TALLER_<id>` (uno por taller cuando se active WhatsApp; objetivo: Vault). Opcional: `META_GRAPH_VERSION` (por defecto `v23.0`).
- Las Edge Functions están en `supabase/functions/<nombre>/index.ts`, con lo común en `_shared/`; `supabase/config.toml` declara `entrypoint` y `verify_jwt` de cada una. Para desplegar, **sin Docker**: `npx supabase functions deploy <nombre> --use-api`, de una en una (una línea con varios nombres se parte al pegarla en la terminal y no llega a ejecutarse).
- Secretos añadidos el 19-sep-2026: `CITALLER_APP_URL` (dominio de producción, al que vuelve el callback si no hay URL de vuelta válida) y `GOOGLE_REDIRECT_URI` (debe coincidir letra por letra con la registrada en Google Cloud).
- Auth: registro público **desactivado** y `site_url` en el dominio de producción, aplicado con `npx supabase config push` el 20-sep-2026.
- Los slugs que invoca el navegador están centralizados en `src/features/integraciones/edgeFunctions.js`: renombrar una función es cambiar una línea ahí (después de desplegar la nueva).

## Edge Functions (desde la fase 1)
Código en `supabase/functions/<nombre>/index.ts`, con lo común en `supabase/functions/_shared/`. Los nombres que invoca el navegador están en `src/features/integraciones/edgeFunctions.js`.

| Nombre | Qué hace | Quién la llama | `verify_jwt` |
|---|---|---|---|
| `conectar-google-calendar` | Comprueba que el usuario gestiona el taller, guarda un `state` de un solo uso (10 min) con la URL de vuelta y devuelve `auth_url` de Google | Panel del taller | `true` |
| `google-calendar-callback` | Consume el `state`, cambia el `code` por tokens, guarda el refresh token en Vault y redirige a la app con `calendar=connected` o `calendar=error&motivo=…` | Google (redirección del navegador) | `false` |
| `crear-evento-google` | Crea el evento de una reserva confirmada (60 min, `Europe/Madrid`) y guarda `google_event_id`. Idempotente | Panel del taller | `true` |
| `cancelar-evento-google` | Borra el evento y limpia `google_event_id`. **Mejor esfuerzo**: si Google falla responde `ok: true` con `aviso`, para no bloquear la cancelación | Panel del taller | `true` |
| `enviar-whatsapp-confirmacion` | Plantilla Meta `confirmacion_cita` (7 parámetros) | Panel del taller | `true` |
| `enviar-whatsapp-recordatorios` | Citas confirmadas de mañana, plantilla `recordatorio_cita` (5 parámetros) | pg_cron, con la cabecera `x-cron-secret` | `false` |

### Slugs antiguos (legado, pendientes de borrar)
Los creó el dashboard con nombres que no decían nada. Siguen desplegados pero **ya no los llama nadie**: el frontend de producción no usa Edge Functions, la rama usa los nombres nuevos y el cron apunta a `enviar-whatsapp-recordatorios`. Se borran desde el dashboard cuando se confirme que todo funciona: `dynamic-function` (era una copia de crear evento; el panel la usaba para "Conectar", de ahí que ese botón estuviera roto), `quick-worker` (crear evento), `bright-service` (callback de OAuth; su redirect URI sigue registrada en Google hasta entonces), `bright-processor` (WhatsApp confirmación) y `hyper-processor` (recordatorios; es la que devolvía 401 al cron por tener `verify_jwt=true`).

## Google Calendar
- Proyecto de Google Cloud `citaller-508917` (nombre "CiTaller", número 474991882154) de la cuenta `miguel.rodriguez.sevilla93@gmail.com`. `gcloud` configurado con ese proyecto. API habilitada (verificado 19-sep-2026): `calendar-json.googleapis.com`. Cliente OAuth 2.0 de tipo web (se revisa en https://console.cloud.google.com/apis/credentials?project=citaller-508917). Pantalla de consentimiento: https://console.cloud.google.com/apis/credentials/consent?project=citaller-508917.
- **Pantalla de consentimiento: en estado "Testing"** (comprobado por Miguel en la consola el 19-sep-2026). Consecuencias: solo pueden conectar las cuentas de Google añadidas como "usuarios de prueba" (máx. 100), y los refresh tokens caducan a los 7 días. La conexión de Rik and Roll (hecha el 17-sep) dejará de funcionar hacia el 24-sep-2026 y habrá que reconectarla desde el panel. **Pendiente (punto 0.7 del plan, antes de la fase 1.3): publicar la app**: en la consola, "Google Auth Platform" → "Audience" (en consolas antiguas: "APIs y servicios" → "Pantalla de consentimiento") → botón "Publish app" → confirmar. Con el scope `calendar.events` (sensible), Google mostrará "Google no ha verificado esta aplicación" y puede pedir verificación; los talleres pueden seguir conectándose con "Configuración avanzada → Ir a CiTaller (no seguro)". La verificación formal queda en el roadmap.
- **Secreto `CITALLER_APP_URL` no existe en Supabase** (verificado con `secrets list`): el callback usa el valor por defecto `http://localhost:5173`, así que en producción la vuelta de Google acaba en localhost. Se crea en la fase 1 con el dominio de Vercel.
- Scope: `https://www.googleapis.com/auth/calendar.events` (sensible).
- **Redirect URI**: desde la fase 1 el callback es `https://zrrqqqbgwwovmglhqxwn.supabase.co/functions/v1/google-calendar-callback` (secreto `GOOGLE_REDIRECT_URI`, que debe coincidir letra por letra con la registrada en Google). Hay que **añadirla** en la consola: Credenciales → el cliente OAuth de tipo web → "URIs de redirección autorizados" → AÑADIR URI → pegarla → GUARDAR. La antigua (`.../functions/v1/bright-service`) se puede quitar cuando se borre esa función.
- Lista de URLs a las que puede volver el flujo (validadas en `_shared/origenes.ts`): el dominio de producción (`CITALLER_APP_URL`), `http://localhost:5173` y los previews de Vercel del proyecto. El frontend manda `volver_a` y el callback solo la acepta si su origen está en esa lista, para que nadie pueda usar el callback como redirección abierta.
- Un taller conecta su calendario desde el panel. Desde la fase 1 el refresh token se guarda **cifrado en Supabase Vault** (`vault.secrets`, nombre `citaller_calendario_google_taller_<id>`) y `integraciones_calendario.refresh_token_secret_id` apunta a él; las Edge Functions lo leen con la función `leer_token_calendario`, que solo puede ejecutar `service_role`. `calendar_id` = `primary`.
- Transición: la conexión de Rik and Roll (17-sep) conserva su token en la columna antigua `refresh_token` en claro hasta que el taller vuelva a conectar; a partir de entonces esa columna queda a null. Las funciones leen primero de Vault y, si no hay secreto, de la columna antigua.

## WhatsApp (Meta Cloud API)
- Cada taller necesita: cuenta de WhatsApp Business (WABA), número con `phone_number_id`, token de acceso permanente (System User) y las plantillas aprobadas `confirmacion_cita` y `recordatorio_cita` en español.
- Datos por taller: `talleres.whatsapp_phone_number_id`, `talleres.whatsapp_business_account_id`, `talleres.whatsapp_activo`; token en el secreto `WHATSAPP_TOKEN_TALLER_<id>` (objetivo: Vault).
- Teléfonos: se normalizan a E.164 sin `+` (9 cifras → prefijo `34`).
- Estado: ningún taller tiene WhatsApp activo todavía.

## Cron (pg_cron + pg_net)
- Job `citaller-recordatorios-whatsapp`, `0 8 * * *` (UTC, o sea 10:00 en Madrid en verano y 09:00 en invierno), creado por la migración `20260919220200`. Hace POST a `enviar-whatsapp-recordatorios` con la cabecera `x-cron-secret`, leyendo el secreto de Vault en cada ejecución: ya no está en claro en el comando del job.
- Arreglado el 20-sep-2026. Antes: el job llamaba a `hyper-processor`, que exigía JWT, y devolvía 401 cada mañana. Verificación manual: respuesta **200** con los recordatorios del día siguiente listados y ninguno enviado (ningún taller tiene WhatsApp activo); sin la cabecera del secreto responde 401.
- Ver ejecuciones: `select status_code, created from net._http_response order by created desc limit 5;`.
- Queda pendiente **rotar el valor del secreto**: el histórico `cron.job_run_details` conserva el comando antiguo con el secreto en claro (solo visible con acceso de dueño del proyecto).

## Vercel
- Proyecto `citaller`, framework Vite, Node 24, conectado a GitHub `miigueelon/citaller` (`main` → producción `citaller.vercel.app`, pública; ramas → previews protegidos).
- CLI `vercel` 59 instalada globalmente, sesión iniciada (`vercel whoami` responde con la cuenta personal) y proyecto vinculado con `vercel link` (`.vercel/` ignorado por git).
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production, preview, development). Creadas el 19-sep-2026.
- `vercel.json` reescribe todas las rutas a `index.html` (SPA con react-router).
