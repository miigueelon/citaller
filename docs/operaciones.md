# Operaciones

## Entorno local
1. Node 24 y npm 11. `npm install`.
2. Copiar `.env.example` a `.env.local` y rellenar (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). `.env.local` no se commitea.
3. `npm run dev` → `http://localhost:5173/?taller=1` (cliente) y `?taller=1&modo=taller` (panel). Tras la fase 2: `/speedbikes` y `/speedbikes/panel`.
4. `npm run lint`, `npm test`, `npm run build`.

## Flujo con Supabase (solo remoto, sin Docker)
- `npx supabase login` y `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn` una vez por equipo.
- **Todo cambio de esquema va en una migración** en `supabase/migrations/` y se aplica con `npx supabase db push`. Nunca editar el esquema desde el dashboard.
- **Antes de cada migración**: backup (`npm run backup` → `backups/<fecha>/`), commit y tag.
- Tipos: `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` tras cada migración.
- Edge Functions: `npx supabase functions deploy <nombre>`; `verify_jwt` se declara en `supabase/config.toml`.
- Secretos: `npx supabase secrets set NOMBRE=valor` (nunca en el repo).
- Nunca borrar datos del proyecto remoto, salvo los del taller de pruebas `e2e`.

## Dar de alta un taller
1. Copiar `clientes/_plantilla/` a `clientes/<slug>/`; rellenar `seed.sql` (taller, servicios, campos extra, horarios, festivos) y `README.md`; añadir assets (logo, imágenes de ayuda) en `assets/`.
2. Aplicar el seed al proyecto (`npm run seed -- <slug>` o desde el SQL Editor con el contenido del fichero). Es idempotente.
3. Crear el usuario del taller en Supabase Auth (invitación) y darlo de alta en `miembros_taller` (fase 4).
4. Integraciones: si usa Google Calendar, el taller pulsa "Conectar Google Calendar" en su panel. Si usa WhatsApp, configurar WABA, plantillas y token (ver `integraciones.md`).
5. Verificar con `docs/checklist-manual.md`.

## Despliegue
- Trabajo en ramas; cada push genera un preview en Vercel (protegido, solo visible con sesión de Vercel).
- `main` despliega a producción automáticamente. Solo se mezcla a `main` una fase verificada (Playwright + checklist) y aprobada.
- Rollback: Vercel → Deployments → Promote de un deploy anterior; en BD, restaurar desde `backups/`.

## Tareas que se hacen a mano en el dashboard de Supabase (no se pueden versionar)
- Auth: desactivar registro público; activar protección de contraseñas filtradas (o vía `supabase/config.toml` + `npx supabase config push`).
- Secretos de Edge Functions.
- Contraseña de la base de datos (Project Settings → Database).
