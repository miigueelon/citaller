# Checklist manual de extremo a extremo

Ejecutar en el preview de Vercel de la rama (o en local) antes de cerrar cada fase. Marcar cada línea.

## Comprobación automática: `npm run probar-cadena`

Verifica de extremo a extremo contra el taller de pruebas `e2e` (id 3), sin tocar Speedbikes ni Rik and Roll: login del taller, lecturas públicas, reserva por la RPC, ocupación, aislamiento entre talleres, confirmar, WhatsApp, Calendar, cancelar, que una cita cancelada no se reabre, y el inicio del OAuth de Google (URL, `redirect_uri`, permisos, `state` inventado rechazado, taller ajeno rechazado). Al final borra la reserva de prueba. Necesita `E2E_TALLER_EMAIL` y `E2E_TALLER_PASSWORD` en `.env.local`; para la limpieza, `SR_KEY` con la clave de servicio.

Resultado del 20-sep-2026: **24 de 24 comprobaciones correctas**.

Lo único que no puede cubrir: que Google muestre su pantalla de permisos y que el evento aparezca de verdad en el calendario del taller. Eso es el bloque siguiente.

## Fase 1: lo que solo puede comprobar una persona (necesita cuentas y navegador)

Primero, en Google Cloud (proyecto `citaller-508917`, cuenta miguel.rodriguez.sevilla93@gmail.com):
- [ ] Pantalla de consentimiento publicada: https://console.cloud.google.com/apis/credentials/consent?project=citaller-508917 → **Publish app** → **Confirm**. Sin esto, los tokens caducan cada 7 días.
- [ ] Redirect URI añadida: https://console.cloud.google.com/apis/credentials?project=citaller-508917 → cliente OAuth de tipo web → "URIs de redirección autorizados" → **AÑADIR URI** → `https://zrrqqqbgwwovmglhqxwn.supabase.co/functions/v1/google-calendar-callback` → **GUARDAR**.

Después, con la app en local (`npm run dev`, `http://localhost:5173/?taller=2&modo=taller`) y la sesión del taller Rik and Roll:
- [ ] **E. Conectar**: "Conectar Google Calendar" lleva a Google, se acepta y vuelve al panel con el aviso "Google Calendar conectado correctamente".
- [ ] **C. Confirmar**: reservar una cita de prueba en `http://localhost:5173/?taller=2`, confirmarla en el panel y comprobar que el evento aparece en el Google Calendar del taller.
- [ ] **D. Cancelar**: cancelar esa misma cita y comprobar que el evento desaparece del calendario.
- [ ] Borrar después la cita de prueba no hace falta: queda como Cancelada, igual que las demás pruebas.

## A. Reservar (público)
- [ ] `/speedbikes` (hoy `/?taller=1`): se ve nombre, dirección y horario del taller.
- [ ] Aparece el campo Kilómetros (solo Speedbikes). Acepta solo dígitos.
- [ ] `/rikandroll`: al elegir Neumáticos aparecen cantidad (1-4), medidas obligatorias e imagen de ayuda.
- [ ] Sin rellenar todos los obligatorios, CONTINUAR está deshabilitado.
- [ ] Calendario: fines de semana y festivos deshabilitados; días sin horario deshabilitados.
- [ ] Al elegir un día se listan las horas; una hora ya ocupada (o el día completo en Speedbikes) no aparece.
- [ ] La última hora muestra el aviso de tarde.
- [ ] Resumen correcto; FINALIZAR crea la reserva **una sola vez** aunque se pulse dos veces; la pantalla de éxito aparece solo después de guardar.
- [ ] En Supabase: fila en `reservas` con `estado='Pendiente'` y los datos correctos.

## B. Panel
- [ ] `/speedbikes/panel` (hoy `/?taller=1&modo=taller`): pide login. Credenciales de otro taller → mensaje de error.
- [ ] Tras login se ven las reservas del taller agrupadas por día; recargar la página mantiene la sesión sin parpadeo.
- [ ] Filtros Pendientes / Confirmadas / Canceladas, búsqueda por nombre/matrícula/vehículo, Hoy / Mañana / 7 días.
- [ ] Historial muestra reservas pasadas, sin botones de acción.
- [ ] Cerrar sesión vuelve al login.

## C. Confirmar
- [ ] Confirmar una pendiente: pasa a Confirmada; botones deshabilitados durante la operación.
- [ ] Rik and Roll: la reserva tiene `google_event_id` y el evento aparece en el Google Calendar del taller.
- [ ] Si el taller tiene WhatsApp activo: el cliente recibe la plantilla; `whatsapp_confirmacion_enviada=true`.

## D. Cancelar
- [ ] Cancelar una confirmada: pide confirmación; pasa a Cancelada; el evento desaparece del calendario; `google_event_id` a null.
- [ ] Si Google falla, la cita se cancela igualmente y el fallo queda registrado (fase 2.5 en adelante).

## E. Conectar Google Calendar
- [ ] En el panel de Rik and Roll: "Conectar Google Calendar" lleva a Google, se acepta, y vuelve al panel con `calendar=connected`.
- [ ] `integraciones_calendario.conectado=true` y `updated_at` reciente.

## F. Recordatorios
- [ ] Invocación manual de la función de recordatorios con el secreto devuelve `ok: true`.
- [ ] A la mañana siguiente, `net._http_response` muestra 200 para el job del cron.

## G. Despliegue
- [ ] Preview de Vercel construye sin errores y carga con las variables de entorno.
- [ ] `?taller=2&modo=taller` redirige a `/rikandroll/panel` (a partir de la fase 2).
