# Arquitectura

## Piezas
- **Frontend**: React 19 + Vite, desplegado en Vercel (`citaller.vercel.app`). SPA con rutas `/<slug>` (reservar) y `/<slug>/panel` (taller). Hoy todavía con `?taller=N&modo=taller` (se migra en la fase 2).
- **Backend**: Supabase (proyecto `zrrqqqbgwwovmglhqxwn`, eu-west-3). Postgres con RLS y grants por columna, Auth (email + contraseña para talleres), Edge Functions (Deno) para integraciones, pg_cron para recordatorios, Vault para secretos.
- **Integraciones**: Google Calendar (OAuth por taller), WhatsApp Cloud API de Meta (plantillas). Ver `integraciones.md`.

## Flujos (cadena completa)
1. **Reservar**: navegador → lectura pública de `talleres`, `horarios_taller`, `festivos_taller` y ocupación de `reservas` (solo `dia, hora, estado`) → RPC `crear_reserva_publica` (SECURITY DEFINER) → fila en `reservas` con `estado='Pendiente'`.
2. **Panel**: navegador → Supabase Auth → `reservas` del taller (política por pertenencia) → `update estado` (solo esa columna).
3. **Confirmar**: panel → Edge `enviar-whatsapp-confirmacion` (Meta) y Edge `crear-evento-google` (Google Calendar). En la fase 3 pasa a una única Edge `confirmar-reserva` que hace todo en servidor y lo registra en `eventos_reserva`.
4. **Cancelar**: panel → Edge `cancelar-evento-google` → `update estado`. En la fase 3, `cancelar-reserva`.
5. **Conectar Calendar**: panel → Edge `conectar-google-calendar` (devuelve `auth_url`) → Google → Edge `google-calendar-callback` (guarda el refresh token) → vuelta al panel.
6. **Recordatorios**: pg_cron 08:00 → Edge `enviar-whatsapp-recordatorios` → Meta.

## Modelo de datos (actual y objetivo)
- `talleres`: config pública + integraciones. Objetivo: `slug`, `modo_capacidad`, `capacidad`, `tipo_vehiculo`, `zona_horaria`, `duracion_cita_min`, textos y marca.
- `reservas`: `taller_id`, datos del cliente, `servicio`, `dia date`, `hora time`, `estado`, flags de WhatsApp y Calendar. Objetivo: `datos_extra jsonb`, `cliente_id`, `vehiculo_id`, `confirmada_por`, `cancelada_por`.
- `horarios_taller` (`dia_semana` 0-6, `hora`, `aviso_tarde`), `festivos_taller` (`fecha`, `nombre`).
- `configuracion_taller` (`max_citas_dia`, `aviso_tarde` texto): se absorbe en `talleres`.
- `integraciones_calendario` (`proveedor`, `calendar_id`, `refresh_token` → Vault, `conectado`), `google_oauth_states`.
- Objetivo: `servicios_taller`, `campos_formulario_taller`, `miembros_taller`, `eventos_reserva`, `clientes`, `vehiculos`. Detalle en `docs/plan.md`, sección 6.

## Decisiones
- **Fechas y horas**: `dia date` + `hora time` en hora local del taller, con `talleres.zona_horaria` (por defecto `Europe/Madrid`). Se convierte solo en los bordes (eventos de Calendar con `timeZone`, cálculo de "mañana" en el cron). En el frontend nunca `new Date("YYYY-MM-DD")` (se interpreta en UTC); siempre las funciones de `lib/fechas`.
- **Identidad del taller**: por `slug` en la URL; el id numérico no sale del backend. Slug desconocido = 404.
- **Config por taller**: en BD. En el repo, `clientes/<slug>/` solo con seed, assets y notas, nunca secretos.
- **Seguridad**: `anon` no accede a tablas con datos personales; solo a vistas/RPC. Los talleres acceden por `miembros_taller`. Las Edge Functions verifican el JWT y la pertenencia, y usan `service_role` solo dentro.
- **Cliente Supabase en el navegador**: uno público (sin sesión) y uno autenticado (una sesión). La pertenencia al taller se comprueba en BD, no en el cliente.
- **Estilos**: CSS propio con tokens (`styles/tokens.css`) y CSS Modules; sin Tailwind.
- **Idioma del código**: dominio en español (`reserva`, `taller`), infraestructura en inglés (`features/`, `hooks`).

## Estructura de carpetas objetivo
Ver `docs/plan.md`, sección 5.
