# CiTaller — guía para Claude Code

## Qué es
App de reserva de citas para talleres (SaaS multi-taller). React 19 + Vite en Vercel; Supabase (Postgres + Auth + Edge Functions + pg_cron). Lee `docs/idea.md` (producto), `docs/arquitectura.md` (decisiones), `docs/integraciones.md` (Google, Meta, cron), `docs/operaciones.md` (cómo operar) y `docs/plan.md` (plan en curso, con casillas).

## Comandos
- `npm run dev` · `npm run build` · `npm run lint` · `npm test` (Vitest) · `npm run e2e` (Playwright, desde la fase 2)
- `npx supabase db push` (migraciones) · `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` · `npx supabase functions deploy <nombre>`
- `npm run backup` antes de cada migración.

## Reglas
- Trabaja en la rama `reestructuracion` (o una rama por tarea). **Nunca hagas push a `main`** ni despliegues a producción sin aprobación explícita.
- **Todo cambio de esquema va en una migración** en `supabase/migrations/`. Nunca cambies el esquema desde el dashboard ni con `execute_sql` en el proyecto remoto.
- **Nunca borres ni modifiques datos del proyecto remoto**, salvo los del taller de pruebas `e2e`.
- **Todas las pruebas de funcionamiento se hacen con el taller de pruebas `e2e`** (id 3, `https://citaller.es/e2e`): Playwright, `npm run probar-cadena` y cualquier prueba a mano de un cambio o de algo nuevo. Speedbikes (id 1) y Rik and Roll (id 2) son clientes reales: en las pruebas solo se leen. Ficha, datos y cómo probar: `clientes/e2e/README.md`.
- No commitees `.env.local` ni ningún secreto. Los secretos van en Supabase Secrets/Vault y en las variables de Vercel. Los seeds de `clientes/<slug>/` no contienen tokens ni IDs de WhatsApp.
- Flujo Supabase **solo remoto, sin Docker**: migraciones escritas a mano y aplicadas con `db push`; verificar con `scripts/rls-test.sql` y los advisors.
- Al terminar una fase de `docs/plan.md`: verificar la cadena end-to-end (Playwright + `docs/checklist-manual.md`), marcar casillas, tag `v0-faseN`, y **parar a pedir aprobación**.
- Fechas: `dia date` + `hora time` en hora local del taller; nunca `new Date("YYYY-MM-DD")`; usar `lib/fechas`.
- Dominio en español (`reserva`, `taller`, `matricula`); infraestructura en inglés (`features/`, `hooks`, `useX`).
- La lógica por taller vive en la BD (`talleres`, `servicios_taller`, `campos_formulario_taller`), nunca en condicionales `tallerId === N`.
- Estilos: CSS propio con tokens y CSS Modules. No añadir Tailwind ni otras librerías de UI sin hablarlo.

## Estructura (objetivo, ver `docs/plan.md` sección 5)
`src/app` (router, providers) · `src/features/{taller,reservar,panel,integraciones}` · `src/components` (UI genérica) · `src/lib` (supabase, fechas) · `src/styles` · `supabase/{migrations,functions}` · `clientes/<slug>/` · `docs/` · `scripts/` · `tests/e2e/`.
