# Checklist manual de extremo a extremo

Ejecutar en el preview de Vercel de la rama (o en local) antes de cerrar cada fase. Marcar cada línea.

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
