# Arquitectura

## Piezas
- **Frontend**: React 19 + Vite, desplegado en Vercel (`citaller.es`; `citaller.vercel.app` sigue apuntando ahí). SPA con rutas `/<slug>` (reservar), `/<slug>/panel` (taller) y `/<slug>/cita/<token>` (el cliente ve o cancela su cita); las URLs antiguas `?taller=N` redirigen.
- **Backend**: Supabase (proyecto `zrrqqqbgwwovmglhqxwn`, eu-west-3). Postgres con RLS y grants por columna, Auth (email + contraseña para talleres), Edge Functions (Deno) para integraciones, pg_cron para recordatorios, Vault para secretos.
- **Integraciones**: Google Calendar (OAuth por taller), WhatsApp Cloud API de Meta (plantillas). Ver `integraciones.md`.

## Flujos (cadena completa)
1. **Reservar**: navegador → vista pública `talleres_publicos`, `horarios_taller`, `festivos_taller`, RPC `ocupacion_dia` (solo recuentos por hora, ningún dato personal) y, en los servicios con antelación, RPC `antelacion_minima` (primera hora reservable, calculada con la hora del servidor) → RPC `crear_reserva_publica` (SECURITY DEFINER) → fila en `reservas` con `estado='Pendiente'`.
2. **Panel**: navegador → Supabase Auth → `reservas` del taller (política por pertenencia) → `update estado` (solo esa columna).
2. **Panel**: navegador → Supabase Auth → `reservas` del taller (política por pertenencia; por REST solo lectura). Los cambios de estado pasan por Edge Functions; las marcas del panel ("Vehículo listo", avisos de WhatsApp) por las RPC `marcar_vehiculo_listo` y `marcar_aviso_whatsapp`.
3. **Confirmar**: panel → Edge `confirmar-reserva` (una sola llamada: estado + WhatsApp según el modo del taller + evento en Google Calendar; idempotente).
4. **Cancelar**: panel → Edge `cancelar-reserva` (estado + WhatsApp + borrado del evento a mejor esfuerzo). El cliente, desde su enlace → Edge `cancelar-cita-cliente` (regla de 24 h).
6. **Recordatorios**: pg_cron 08:00 → Edge `enviar-whatsapp-recordatorios` → Meta.

## Modelo de datos (actual y objetivo)
- `talleres`: config pública + integraciones. Objetivo: `slug`, `modo_capacidad`, `capacidad`, `tipo_vehiculo`, `zona_horaria`, `duracion_cita_min`, textos y marca.
- `reservas`: `taller_id`, datos del cliente, `servicio`, `dia date`, `hora time`, `estado`, flags de WhatsApp y Calendar. Objetivo: `datos_extra jsonb`, `cliente_id`, `vehiculo_id`, `confirmada_por`, `cancelada_por`.
- `horarios_taller` (`dia_semana` 0-6, `hora`, `aviso_tarde`, `bloque` 1 = mañana / 2 = tarde), `festivos_taller` (`fecha`, `nombre`).
- `servicios_taller.bloques_antelacion` (+ `antelacion_texto`): bloques de apertura enteros que el taller necesita entre la solicitud y la cita (Neumáticos en Rik and Roll: 1). La regla vive en `antelacion_minima_en` (el bloque abierto en el momento de la solicitud, o el siguiente que abre, es para recibir el material; la cita, desde el bloque de después) y la aplican `validar_datos_reserva` (CT021, solo a clientes) y la web (RPC `antelacion_minima`).
- `configuracion_taller` (`max_citas_dia`, `aviso_tarde` texto): se absorbe en `talleres`.
- `integraciones_calendario` (`proveedor`, `calendar_id`, `refresh_token_secret_id` → secreto cifrado en Vault; `refresh_token` en claro solo en conexiones anteriores al 19-sep-2026, `conectado`), `google_oauth_states` (`state` de un solo uso, `user_id`, `volver_a`, `expires_at`).
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
