# Línea base de permisos (RLS y grants) — 19-sep-2026

Resultado de `scripts/rls-test.sql` contra el proyecto remoto antes de cualquier migración. `ok=false` marca lo que corrige la fase 1.

| # | Comprobación | Actual | Objetivo fase 1 | OK |
|---|---|---|---|---|
| 1 | anon lee `reservas.hora` | true | true | ✔ |
| 2 | anon lee `reservas.estado` | true | true | ✔ |
| 3 | anon lee `reservas.telefono` (PII) | false | false | ✔ |
| 4 | anon lee `reservas.nombre` (PII) | false | false | ✔ |
| 5 | anon lee `reservas.matricula` (PII) | false | false | ✔ |
| 6 | anon inserta directamente en `reservas` | **true** | false | ✘ |
| 7 | anon lee `talleres.nombre` | true | true | ✔ |
| 8 | anon lee `talleres.user_id` | false | false | ✔ |
| 9 | anon lee `talleres.whatsapp_phone_number_id` | false | false | ✔ |
| 10 | anon lee `horarios_taller` | true | true | ✔ |
| 11 | anon lee `festivos_taller` | true | true | ✔ |
| 12 | anon tiene privilegios en `integraciones_calendario` | **true** | false | ✘ |
| 13 | anon tiene privilegios en `google_oauth_states` | **true** | false | ✘ |
| 14 | anon tiene privilegios en `configuracion_taller` | **true** | false | ✘ |
| 15 | anon ejecuta `crear_reserva_publica` | true | true | ✔ |
| 16 | authenticated actualiza `reservas.estado` | true | true | ✔ |
| 17 | authenticated actualiza `reservas.telefono` | false | false | ✔ |
| 18 | authenticated lee `talleres.user_id` (de todos los talleres) | **true** | false | ✘ |
| 19 | authenticated tiene privilegios en `integraciones_calendario` | **true** | false | ✘ |
| 20 | RLS activa en `reservas` | true | true | ✔ |
| 21 | RLS activa en `talleres` | true | true | ✔ |
| 22 | RLS activa en `integraciones_calendario` | true | true | ✔ |
| 23 | FK `reservas.taller_id → talleres` | **false** | true | ✘ |
| 24 | CHECK/enum en `reservas.estado` | **false** | true | ✘ |

Conclusión: los datos personales de las reservas y los identificadores internos de los talleres **no** son legibles con la clave pública (grants por columna). Las tablas internas (12, 13, 14, 19) solo las protege que RLS esté activa sin políticas; la fase 1 revoca esos privilegios como defensa en profundidad.
