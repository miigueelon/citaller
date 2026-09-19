# Operaciones

## Entorno local
1. Node 24 y npm 11. `npm install`.
2. Copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Opcional: `SUPABASE_DB_PASSWORD`, que solo usa `npm run backup` (Supabase → Project Settings → Database → "Reset database password" si no se conoce). `.env.local` no se commitea.
3. `npm run dev` → `http://localhost:5173/?taller=1` (cliente) y `?taller=1&modo=taller` (panel). Tras la fase 2: `/speedbikes` y `/speedbikes/panel`.
4. `npm run lint`, `npm test`, `npm run build`.

## Flujo con Supabase (solo remoto, sin Docker)
- `npx supabase login` y `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn` una vez por equipo. La CLI trabaja por la API de gestión con ese token: **no pide la contraseña de la base de datos** para `db push`, `migration list`, `migration repair`, `functions deploy` ni `gen types`.
- **Todo cambio de esquema va en una migración** en `supabase/migrations/` (`npx supabase migration new <nombre>` crea el fichero con sello de tiempo) y se aplica con `npx supabase db push` (antes, `npx supabase db push --dry-run` para ver qué se aplicaría). Nunca editar el esquema desde el dashboard ni con SQL suelto.
- **Antes de cada migración**: `npm run backup` (→ `backups/<fecha>/`, carpeta ignorada por git; necesita `SUPABASE_DB_PASSWORD`), commit y tag.
- La baseline `20260919210000` está marcada como aplicada con `migration repair` porque reproduce lo que ya existía. Nunca ejecutar `db reset` contra el proyecto remoto.
- Seeds: `clientes/<slug>/seed.sql` (fase 3), declarados en `supabase/config.toml` (`[db.seed] sql_paths`); se aplican con `npx supabase db push --include-seed`. Deben ser idempotentes y no contener secretos.
- Tipos: `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` tras cada migración.
- Edge Functions: `npx supabase functions deploy <nombre>`; `verify_jwt` se declara en `supabase/config.toml`.
- Secretos: `npx supabase secrets set NOMBRE=valor` (nunca en el repo).
- **`npx supabase config push` no se ejecuta hasta la fase 1.4**: empuja toda la sección `[auth]` de `config.toml` (registro público desactivado, `site_url`, URLs de redirección). Revisar esos valores antes de lanzarlo.
- Nunca borrar datos del proyecto remoto, salvo los del taller de pruebas `e2e`.

## Dar de alta un taller
1. Copiar `clientes/_plantilla/` a `clientes/<slug>/`; rellenar `seed.sql` (taller, servicios, campos extra, horarios, festivos) y `README.md`; añadir assets (logo, imágenes de ayuda) en `assets/`.
2. Aplicar el seed al proyecto (`npx supabase db push --include-seed`). Es idempotente.
3. Crear el usuario del taller en Supabase Auth (invitación) y darlo de alta en `miembros_taller` (fase 4).
4. Integraciones: si usa Google Calendar, el taller pulsa "Conectar Google Calendar" en su panel. Si usa WhatsApp, configurar WABA, plantillas y token (ver `integraciones.md`).
5. Verificar con `docs/checklist-manual.md`.

## Despliegue
- Trabajo en ramas; cada push genera un preview en Vercel (protegido, solo visible con sesión de Vercel).
- `main` despliega a producción automáticamente. Solo se mezcla a `main` una fase verificada (Playwright + checklist) y aprobada.
- Rollback: Vercel → Deployments → Promote de un deploy anterior; en BD, restaurar desde `backups/`.

## Secretos y Vault
- Secretos de Edge Functions (`npx supabase secrets list` / `set`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CITALLER_APP_URL`, `CITALLER_CRON_SECRET`, y `WHATSAPP_TOKEN_TALLER_<id>` cuando se active WhatsApp.
- Dentro de la base de datos, en Vault (`vault.secrets`, cifrado): `citaller_cron_secret` (cabecera `x-cron-secret` del job de recordatorios, igual que el secreto de Edge Functions), `citaller_project_url` (URL del proyecto que usan los jobs) y un `citaller_calendario_google_taller_<id>` por taller con Google conectado.
- Solo `service_role` y el rol `postgres` pueden leerlos: `anon` y `authenticated` no tienen acceso ni a `vault.decrypted_secrets` ni a las funciones `leer_token_calendario` / `guardar_token_calendario`.
- Ver los nombres (nunca los valores): `select name, description, updated_at from vault.secrets order by name;`.

## Cron de recordatorios
- Job `citaller-recordatorios-whatsapp` (`0 8 * * *` UTC), creado por migración; lee el secreto de Vault y llama a la Edge Function `enviar-whatsapp-recordatorios`.
- Estado: `select jobname, schedule, active from cron.job;` y últimas ejecuciones: `select status_code, created from net._http_response order by created desc limit 5;`.
- Prueba manual (no envía nada si ningún taller tiene WhatsApp activo): ejecutar el mismo `net.http_post` del job y consultar `net._http_response`.

## Tareas que se hacen a mano en el dashboard de Supabase (no se pueden versionar)
- **Protección de contraseñas filtradas**: el aviso del linter no se puede quitar porque la organización está en el **plan gratuito** (esa función requiere plan Pro). Queda aceptado y documentado; revisarlo si algún día se sube de plan.
- Secretos de Edge Functions (o `npx supabase secrets set`).
- Contraseña de la base de datos (Project Settings → Database): solo hace falta para `npm run backup`.
- Borrar Edge Functions antiguas (la CLI no lo hace): Dashboard → Edge Functions → la función → Delete.

## Tareas que se hacen a mano en Google Cloud
- Publicar la pantalla de consentimiento (hoy en "Testing"; ver `integraciones.md`).
- Registrar la redirect URI nueva antes de renombrar el callback, y quitar la antigua después.
