# Operaciones

## Entorno local
1. Node 24 y npm 11. `npm install`.
2. Copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Opcional: `SUPABASE_DB_PASSWORD`, que solo usa `npm run backup` (Supabase → Project Settings → Database → "Reset database password" si no se conoce). `.env.local` no se commitea.
3. `npm run dev` → `http://localhost:5173/speedbikes` (cliente), `/speedbikes/panel` (panel) y `/e2e` para el taller de pruebas. Las URLs antiguas `?taller=N[&modo=taller]` redirigen.
4. Comprobaciones: `npm run typecheck` (tipos), `npm run lint`, `npm test` (lógica pura con Vitest), `npm run build`, `npm run e2e` (Playwright contra el servidor local o contra un preview con `E2E_BASE_URL=https://...`), `npm run probar-cadena` (cadena completa contra Supabase).
5. Utilidades: `node scripts/capturas.mjs <carpeta>` guarda capturas de las pantallas principales para comparar cambios de estilo; `node scripts/optimizar-imagenes.mjs` comprime las imágenes de `src/assets`.

## Flujo con Supabase (solo remoto, sin Docker)
- `npx supabase login` y `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn` una vez por equipo. La CLI trabaja por la API de gestión con ese token: **no pide la contraseña de la base de datos** para `db push`, `migration list`, `migration repair`, `functions deploy` ni `gen types`.
- **Todo cambio de esquema va en una migración** en `supabase/migrations/` (`npx supabase migration new <nombre>` crea el fichero con sello de tiempo) y se aplica con `npx supabase db push` (antes, `npx supabase db push --dry-run` para ver qué se aplicaría). Nunca editar el esquema desde el dashboard ni con SQL suelto.
- **Antes de cada migración**: `npm run backup` (→ `backups/<fecha>/`, carpeta ignorada por git; necesita `SUPABASE_DB_PASSWORD`), commit y tag.
- La baseline `20260919210000` está marcada como aplicada con `migration repair` porque reproduce lo que ya existía. Nunca ejecutar `db reset` contra el proyecto remoto.
- Seeds: `clientes/<slug>/seed.sql` (fase 3), declarados **uno a uno** en `supabase/config.toml` (`[db.seed] sql_paths`; nunca con `*`, porque cargaría `_plantilla`); se aplican con `npx supabase db push --include-seed`. Deben ser idempotentes y no contener secretos. **Ojo**: la CLI recuerda el hash de cada seed ya aplicado; si se edita un seed que ya se aplicó antes, `db push --include-seed` solo actualiza el hash ("Updating seed hash") y **no lo vuelve a ejecutar**. Para reaplicarlo hay que ejecutar su SQL a mano (SQL Editor del dashboard o `execute_sql`), que es seguro porque los seeds son solo datos e idempotentes.
- Tipos: `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` tras cada migración.
- Edge Functions: `npx supabase functions deploy <nombre>`; `verify_jwt` se declara en `supabase/config.toml`.
- Secretos: `npx supabase secrets set NOMBRE=valor` (nunca en el repo).
- **`npx supabase config push` no se ejecuta hasta la fase 1.4**: empuja toda la sección `[auth]` de `config.toml` (registro público desactivado, `site_url`, URLs de redirección). Revisar esos valores antes de lanzarlo.
- Nunca borrar datos del proyecto remoto, salvo los del taller de pruebas `e2e`.

## Dar de alta un taller
1. Copiar `clientes/_plantilla/` a `clientes/<slug>/`; rellenar `seed.sql` (taller, `modo_capacidad` + `capacidad`, `whatsapp_modo`, textos, servicios con su modo de descripción, campos extra, horarios, festivos) y `README.md`; añadir assets (logo, imágenes de ayuda) en `assets/`. Nada de lógica por taller en el código: todo lo que cambia entre talleres vive en el seed.
2. Añadir la ruta del seed a `sql_paths` en `supabase/config.toml` y aplicarlo (`npx supabase db push --include-seed`). Es idempotente. `npm test` comprueba que el seed no menciona otros slugs ni contiene secretos.
3. Crear el usuario del taller en Supabase Auth (invitación) y vincularlo (`talleres.user_id`; en la fase 5, `miembros_taller`).
4. Integraciones: si usa Google Calendar, el taller pulsa "Conectar Google Calendar" en su panel. WhatsApp según `whatsapp_modo`: `api` (WABA, plantillas y token; ver `integraciones.md`), `enlace` (nada que configurar: el panel abre WhatsApp con el mensaje escrito) o `ninguno`.
5. Promoción: `node scripts/qr.mjs <slug>` genera `clientes/<slug>/assets/qr-reserva.{svg,png}` y el enlace de reserva se pone en Google Business Profile (sección siguiente).
6. Verificar con `docs/checklist-manual.md` (en la fase 3.7 se hizo con un taller de prueba creado solo desde `_plantilla`).

## Promoción: Google Business Profile y QR
- **Enlace de reserva**: la URL pública del taller es `https://citaller.es/<slug>` (dominio propio desde el 21-sep-2026; `https://citaller.vercel.app/<slug>` sigue funcionando y no se retira, así que los QR impresos antes valen). En Google Business Profile (https://business.google.com → el perfil del taller → "Editar perfil" → "Reservas" / "Enlaces de citas", el nombre cambia según la versión) se pega esa URL como enlace de citas; Google la muestra como botón "Reservar" en la ficha de Maps y en la búsqueda. Sin un proveedor de reservas integrado con Google, este enlace es la vía: el cliente pulsa y llega al formulario del taller.
- **QR del mostrador**: `node scripts/qr.mjs` (todos los talleres) o `node scripts/qr.mjs <slug>`. Genera `clientes/<slug>/assets/qr-reserva.svg` (para imprenta, escala sin perder calidad) y `qr-reserva.png` (1024 px, para imprimir en casa o pegar en un cartel). Codifican exactamente `<CITALLER_APP_URL>/<slug>`; `npm test` lo comprueba decodificando el PNG. Se pueden pedir a la imprenta con un texto tipo "Reserva tu cita escaneando el código" y probarlos con la cámara del móvil antes de imprimir en cantidad.
- Si algún día cambia el dominio, se vuelve a ejecutar el script; los QR ya impresos siguen funcionando mientras la URL antigua de Vercel siga activa (no se retira).

## Dominio y correo (desde el 21-sep-2026)
- **Dominio `citaller.es`**, comprado en **Hostinger** (hPanel), que es quien lleva el DNS. En Vercel → proyecto `citaller` → Settings → Domains están las tres direcciones: `citaller.es` sirve producción (opción "Connect to an environment" → Production), `www.citaller.es` redirige a ella con 308, y `citaller.vercel.app` sigue activa como respaldo. En Hostinger: registro A del apex apuntando a Vercel y CNAME `www` → `cname.vercel-dns.com`. Vercel marca `www` con "DNS Change Recommended" porque prefiere su CNAME específico; es inofensivo mientras `www` solo redirija.
- **Orden de los cambios si algún día se cambia de dominio**: primero Vercel + DNS, después `secrets set CITALLER_APP_URL` (y `CITALLER_ORIGENES_EXTRA` con las URLs antiguas que sigan en uso, para no romper la vuelta del OAuth de Google), después `node scripts/qr.mjs`, y las plantillas de Meta al final porque quedan atadas al dominio para siempre.
- **Correo `hola@citaller.es`**: buzón en Hostinger (Emails → `citaller.es` → Buzones) con un **reenviador** a la cuenta personal de Gmail de Miguel (Emails → la fila del dominio → Buzones → Reenviadores). Los registros MX de `citaller.es` apuntan a `mx1/mx2.hostinger.com`; el correo y la web son independientes. **Aviso de facturación**: el plan es "Starter Business Email Free Trial" y **vence el 21-oct-2026 con renovación automática activada**. Si no se quiere pagar, desactivar la renovación en el menú de tres puntos de esa fila y cambiar `CORREO_CONTACTO` en `src/features/sitio/contacto.ts`.

## Página principal y política de privacidad
- `/` (`src/features/sitio/InicioPage.tsx`) explica CiTaller a un taller que llega por curiosidad y es la página de inicio que Google exige para publicar la app de Calendar. `/privacidad` (`PrivacidadPage.tsx`) es la política de privacidad: RGPD para los datos que dejan los clientes y la declaración de "uso limitado" de las API de Google. Los clientes llegan a ella desde la firma "Reservas gestionadas con CiTaller · Privacidad" de las pantallas de reserva y de cita. Las URLs antiguas `/?taller=N` siguen redirigiendo.
- Los únicos textos de esas páginas que no describe el producto están en `src/features/sitio/contacto.ts`: `RESPONSABLE` (quién responde de los datos), `CORREO_CONTACTO` (buzón para talleres interesados y para ejercer derechos; tiene que existir de verdad) y `POLITICA_ACTUALIZADA` (la fecha que se muestra: cambiarla cada vez que cambie la política).
- Verificar el dominio en Google Search Console: con `citaller.es` se hace por **registro TXT en el DNS** (propiedad de dominio, cubre también `www` y `https`). Si alguna vez hiciera falta verificar por fichero HTML (propiedad de prefijo de URL), el `googleXXXX.html` que da Google se deja en `public/` y Vercel lo sirve tal cual: los ficheros estáticos van antes que la regla de `vercel.json` que manda todo a `index.html`.
- Publicar la app de Google (Google Cloud → Google Auth Platform → Branding y Audience): nombre "CiTaller", correo de soporte, página principal `https://citaller.es`, política de privacidad `https://citaller.es/privacidad`, dominio autorizado `citaller.es`, y "Publish app". Con el scope `calendar.events` Google puede pedir verificación; mientras tanto los talleres ven "Google no ha verificado esta aplicación" y siguen por "Configuración avanzada". Comprobar el efecto real: reconectar el taller `e2e` y ver que el permiso ya no caduca a los 7 días.

## Despliegue
- Trabajo en ramas; cada push genera un preview en Vercel (protegido, solo visible con sesión de Vercel).
- `main` despliega a producción automáticamente. Solo se mezcla a `main` una fase verificada (Playwright + checklist) y aprobada.
- Rollback: Vercel → Deployments → Promote de un deploy anterior; en BD, restaurar desde `backups/`.

## Secretos y Vault
- Secretos de Edge Functions (`npx supabase secrets list` / `set`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CITALLER_APP_URL`, `CITALLER_CRON_SECRET`, y `WHATSAPP_TOKEN_TALLER_<id>` cuando un taller pase a `whatsapp_modo='api'`. Opcionales: `WHATSAPP_PLANTILLA_CONFIRMACION`, `WHATSAPP_PLANTILLA_CANCELACION`, `WHATSAPP_PLANTILLA_RECORDATORIO` (nombres de las plantillas aprobadas en Meta si no son los por defecto), `WHATSAPP_CONFIRMACION_CON_ENLACE=true` cuando la plantilla de confirmación lleve el botón de URL al enlace de la cita, `META_GRAPH_VERSION`.
- Dentro de la base de datos, en Vault (`vault.secrets`, cifrado): `citaller_cron_secret` (cabecera `x-cron-secret` del job de recordatorios, igual que el secreto de Edge Functions), `citaller_project_url` (URL del proyecto que usan los jobs) y un `citaller_calendario_google_taller_<id>` por taller con Google conectado.
- Solo `service_role` y el rol `postgres` pueden leerlos: `anon` y `authenticated` no tienen acceso ni a `vault.decrypted_secrets` ni a las funciones `leer_token_calendario` / `guardar_token_calendario`.
- Ver los nombres (nunca los valores): `select name, description, updated_at from vault.secrets order by name;`.

## Cuando falla un WhatsApp o Google Calendar
- Cada fallo queda en la reserva (`whatsapp_error`, `google_error`) y la tarjeta del panel lo enseña en un aviso. **Reintentar es volver a pulsar Confirmar** (o Cancelar): las funciones son idempotentes y solo repiten lo que quedó pendiente (no envían dos veces el WhatsApp ni crean dos eventos).
- "La conexión con Google Calendar ha caducado": el taller pulsa "Conectar Google Calendar" otra vez (con la app de Google en "Prueba" pasa cada 7 días).
- En modo `enlace` no hay envío automático: el panel enseña el botón "Abrir WhatsApp con el mensaje" tras confirmar o cancelar, "Avisar por WhatsApp" en cada tarjeta y la lista "Recordatorios para mañana". Los textos se pueden personalizar por taller en `talleres.texto_whatsapp_confirmacion/cancelacion/recordatorio` (marcadores `{nombre} {taller} {dia} {hora} {vehiculo} {servicio} {matricula} {enlace_cita} {enlace_reserva}`).

## Cron de recordatorios
- Job `citaller-recordatorios-whatsapp` (`0 8 * * *` UTC), creado por migración; lee el secreto de Vault y llama a la Edge Function `enviar-whatsapp-recordatorios`, que **solo envía a los talleres en `whatsapp_modo='api'`** (los de modo `enlace` usan la lista "Recordatorios para mañana" del panel).
- Estado: `select jobname, schedule, active from cron.job;` y últimas ejecuciones: `select status_code, created from net._http_response order by created desc limit 5;`.
- Prueba manual (no envía nada si ningún taller tiene WhatsApp activo): ejecutar el mismo `net.http_post` del job y consultar `net._http_response`.

## Tareas que se hacen a mano en el dashboard de Supabase (no se pueden versionar)
- **Protección de contraseñas filtradas**: el aviso del linter no se puede quitar porque la organización está en el **plan gratuito** (esa función requiere plan Pro). Queda aceptado y documentado; revisarlo si algún día se sube de plan.
- Secretos de Edge Functions (o `npx supabase secrets set`).
- Contraseña de la base de datos (Project Settings → Database): solo hace falta para `npm run backup`.
- Borrar Edge Functions antiguas (la CLI no lo hace): Dashboard → Edge Functions → la función → Delete. Pendientes de borrar: los cinco slugs de antes de la fase 1 (`dynamic-function`, `quick-worker`, `bright-service`, `bright-processor`, `hyper-processor`) y, una semana después de desplegar la fase 3, `enviar-whatsapp-confirmacion`, `crear-evento-google` y `cancelar-evento-google` (sustituidas por `confirmar-reserva` / `cancelar-reserva`).
- Ejecutar a mano un seed ya aplicado que se haya modificado (ver "Flujo con Supabase").

## Tareas que se hacen a mano en Google Cloud
- Publicar la pantalla de consentimiento (hoy en "Testing"; ver `integraciones.md`).
- Registrar la redirect URI nueva antes de renombrar el callback, y quitar la antigua después.
