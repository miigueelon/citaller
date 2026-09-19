# Integraciones

## Supabase
- Proyecto: `CiTaller` (`zrrqqqbgwwovmglhqxwn`, eu-west-3). URL: `https://zrrqqqbgwwovmglhqxwn.supabase.co`.
- Clave publicable (anon): en `.env.local` y en las variables de Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Se expone al navegador por diseño; la seguridad la dan RLS y los grants por columna.
- Secretos de Edge Functions existentes el 19-sep-2026 (`npx supabase secrets list`, solo nombres): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CITALLER_CRON_SECRET`, más los automáticos `SUPABASE_*`. **Faltan**: `CITALLER_APP_URL` (necesario para el callback de Google) y `WHATSAPP_TOKEN_TALLER_<id>` (uno por taller cuando se active WhatsApp; objetivo: Vault). Opcional: `META_GRAPH_VERSION` (por defecto `v23.0`).
- Las Edge Functions están en `supabase/functions/<slug>/` con su fichero original; `supabase/config.toml` declara `entrypoint` y `verify_jwt` de cada una. Para desplegar: `npx supabase functions deploy <slug>`.

## Edge Functions (estado actual → nombre objetivo)
| Slug actual | Nombre objetivo | Qué hace | Auth |
|---|---|---|---|
| `dynamic-function` | (se elimina; su código es el de crear evento) | — | — |
| *(perdida)* | `conectar-google-calendar` | Genera la URL de autorización de Google y guarda un `state` de un solo uso en `google_oauth_states` | JWT de usuario del taller |
| `bright-service` | `google-calendar-callback` | Recibe `code` y `state`, cambia el código por tokens, guarda el refresh token, redirige al panel | Público (lo llama Google); `verify_jwt=false` |
| `quick-worker` | `crear-evento-google` (módulo de `confirmar-reserva` en la fase 3) | Crea el evento (60 min, `Europe/Madrid`) y guarda `google_event_id` | JWT |
| `cancelar-evento-google` | `cancelar-evento-google` (módulo de `cancelar-reserva`) | Borra el evento y limpia `google_event_id` | JWT |
| `bright-processor` | `enviar-whatsapp-confirmacion` | Plantilla Meta `confirmacion_cita` (7 parámetros) | JWT |
| `hyper-processor` | `enviar-whatsapp-recordatorios` | Citas confirmadas de mañana, plantilla `recordatorio_cita` (5 parámetros) | `x-cron-secret`; debe tener `verify_jwt=false` (hoy está a `true` y el cron falla con 401) |

## Google Calendar
- Proyecto de Google Cloud `citaller-508917` (nombre "CiTaller", número 474991882154) de la cuenta `miguel.rodriguez.sevilla93@gmail.com`. `gcloud` configurado con ese proyecto. API habilitada (verificado 19-sep-2026): `calendar-json.googleapis.com`. Cliente OAuth 2.0 de tipo web (se revisa en https://console.cloud.google.com/apis/credentials?project=citaller-508917). Pantalla de consentimiento: https://console.cloud.google.com/apis/credentials/consent?project=citaller-508917.
- **Secreto `CITALLER_APP_URL` no existe en Supabase** (verificado con `secrets list`): el callback usa el valor por defecto `http://localhost:5173`, así que en producción la vuelta de Google acaba en localhost. Se crea en la fase 1 con el dominio de Vercel.
- Scope: `https://www.googleapis.com/auth/calendar.events` (sensible).
- Redirect URI registrada hoy: `https://zrrqqqbgwwovmglhqxwn.supabase.co/functions/v1/bright-service`. Al renombrar el callback hay que **añadir** `.../functions/v1/google-calendar-callback` antes de desplegar y quitar la antigua después.
- **Pantalla de consentimiento**: si está en estado *Testing*, los refresh tokens caducan a los 7 días y la conexión se rompe semanalmente. Debe estar *In production* (con scope sensible Google puede pedir verificación; mientras tanto muestra "app no verificada" pero funciona para los talleres que acepten).
- Un taller conecta su calendario desde el panel; el refresh token se guarda por taller en `integraciones_calendario` (objetivo: cifrado en Vault). `calendar_id` = `primary`.

## WhatsApp (Meta Cloud API)
- Cada taller necesita: cuenta de WhatsApp Business (WABA), número con `phone_number_id`, token de acceso permanente (System User) y las plantillas aprobadas `confirmacion_cita` y `recordatorio_cita` en español.
- Datos por taller: `talleres.whatsapp_phone_number_id`, `talleres.whatsapp_business_account_id`, `talleres.whatsapp_activo`; token en el secreto `WHATSAPP_TOKEN_TALLER_<id>` (objetivo: Vault).
- Teléfonos: se normalizan a E.164 sin `+` (9 cifras → prefijo `34`).
- Estado: ningún taller tiene WhatsApp activo todavía.

## Cron (pg_cron + pg_net)
- Job `recordatorio-whatsapp-diario`, `0 8 * * *` (UTC), POST a la función de recordatorios con cabecera `x-cron-secret`.
- Problema actual: la función exige JWT → 401 diario. Arreglo en la fase 1 (`verify_jwt=false` en `supabase/config.toml`, secreto en Vault, job creado por migración).

## Vercel
- Proyecto `citaller`, framework Vite, Node 24, conectado a GitHub `miigueelon/citaller` (`main` → producción `citaller.vercel.app`; ramas → previews protegidos).
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production, preview, development). Creadas el 19-sep-2026.
- `vercel.json` reescribe todas las rutas a `index.html` (SPA con react-router).
