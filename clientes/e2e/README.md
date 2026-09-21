# Taller de pruebas `e2e` — aquí se prueba todo

**Todas las pruebas de funcionamiento de CiTaller se hacen con este taller**: las automáticas
(Playwright, `probar-cadena`) y cualquier prueba a mano de un cambio o de algo nuevo antes de
llevarlo a los talleres reales. Es el único taller cuyos datos se pueden crear, cambiar y borrar
(regla de `CLAUDE.md`). Speedbikes (id 1) y Rik and Roll (id 2) son clientes reales: en las pruebas
solo se leen, nunca se reserva ni se entra en su panel.

## Datos

| | |
|---|---|
| Nombre | Taller de pruebas e2e |
| id / slug | `3` / `e2e` |
| Página de reserva | https://citaller.es/e2e (también en local: http://localhost:5173/e2e) |
| Panel | https://citaller.es/e2e/panel |
| Usuario del panel | `E2E_TALLER_EMAIL` y `E2E_TALLER_PASSWORD` de `.env.local` (nunca en el repo) |
| Huecos | Por hora, 2 a la vez, **máximo 7 al día** (así se prueba también el tope diario) |
| Horario | Lunes a viernes, 9:00, 10:00, 11:00 y 12:00; festivo el 25-dic |
| Servicios | Los 7 habituales (Revisión, Aceite, Frenos, Neumáticos, ITV, Avería, Otro) |
| Campos extra | Kilómetros (opcional) y cantidad de neumáticos (obligatorio en Neumáticos): los de los dos talleres reales juntos |
| Mecánicos | "Mecánico A" y "Mecánico B" (para probar "¿Quién la apunta?") |
| WhatsApp | Modo `ninguno`: los botones de WhatsApp no salen y "Vehículo listo" solo termina la cita |
| Google Calendar | Conectado el 20-sep-2026, con la app de Google aún en "Prueba": ese permiso caduca hacia el 27-sep. Si `probar-cadena` dice "Calendar: el taller e2e no está conectado (o falló)", entrar en su panel y pulsar "Conectar Google Calendar" |

La configuración vive en `clientes/e2e/seed.sql` (se puede volver a aplicar: es idempotente).

## Cómo se prueba un cambio

1. `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`.
2. `npm run probar-cadena`: la cadena completa contra la base de datos real, sobre este taller
   (reservar, rechazos, capacidad, panel, confirmar, cancelar, cita a mano, cancelación del cliente,
   Vehículo listo, avisos de WhatsApp, Google, cron). Cancela lo que crea al terminar.
3. `npm run e2e`: Playwright en el navegador, contra el servidor local. Contra el preview de Vercel:
   `export E2E_BYPASS_SECRET=…` (de `.env.local`) y `E2E_BASE_URL=https://citaller-….vercel.app`.
   Contra producción: `E2E_BASE_URL=https://citaller.es`, **sin** exportar el secreto.
   `tests/e2e/talleres-reales.spec.ts` comprueba, solo leyendo, que las páginas de Speedbikes y Rik
   and Roll cargan.
4. Permisos de la base de datos: `npx supabase db query --linked -f scripts/rls-test.sql` (todo `"ok": true`).
5. Edge Functions: desde `supabase/functions`, `deno check --node-modules-dir=none <función>/index.ts`.

## Probar algo que este taller no tiene

Si una prueba necesita otra configuración (por ejemplo, WhatsApp en modo `enlace` para ver los
botones de WhatsApp), se cambia **solo en este taller** y se deja como estaba al terminar:

```sql
update public.talleres set whatsapp_modo = 'enlace' where id = 3;   -- probar
update public.talleres set whatsapp_modo = 'ninguno' where id = 3;  -- dejarlo como estaba
```

Una incorporación nueva que se configura por taller (un campo, un servicio, un texto) se prueba
primero aquí; cuando funciona, se añade al seed del taller real y se aplica con el OK de Miguel.

## Ojo

- Cualquiera que conozca la dirección puede pedir cita en https://citaller.es/e2e. No pasa nada (no
  avisa a nadie y las pruebas limpian al empezar), pero no se enseña a clientes.
- Las pruebas cancelan lo que crean; las citas canceladas se acumulan en la pestaña Canceladas del
  panel de pruebas. Si molestan, se borran (solo las de `taller_id = 3`).
