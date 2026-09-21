# CiTaller

Reserva de citas online para talleres de vehículos, con panel para el taller, WhatsApp de confirmación y Google Calendar.

- Producto y hoja de ruta: [docs/idea.md](docs/idea.md)
- Arquitectura y decisiones: [docs/arquitectura.md](docs/arquitectura.md)
- Integraciones (Supabase, Google, Meta, cron, Vercel): [docs/integraciones.md](docs/integraciones.md)
- Cómo operar (entorno, migraciones, alta de taller, deploy): [docs/operaciones.md](docs/operaciones.md)
- Plan de reestructuración en curso: [docs/plan.md](docs/plan.md)
- Checklist de verificación end-to-end: [docs/checklist-manual.md](docs/checklist-manual.md)

## Arranque rápido
```bash
npm install
cp .env.example .env.local   # rellenar con la URL y la clave publicable de Supabase
npm run dev
```
Cliente: `http://localhost:5173/speedbikes` · Panel: `http://localhost:5173/speedbikes/panel` (las URLs antiguas `?taller=1` y `?taller=1&modo=taller` siguen redirigiendo).

## Stack
React 19 · Vite 8 · Supabase (Postgres, Auth, Edge Functions, pg_cron) · Vercel.
