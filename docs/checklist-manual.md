# Checklist manual de extremo a extremo

Ejecutar en el preview de Vercel de la rama (o en local) antes de cerrar cada fase. Marcar cada línea.

## Comprobación automática: `npm run probar-cadena`

Verifica de extremo a extremo contra el taller de pruebas `e2e` (id 3), sin tocar Speedbikes ni Rik and Roll. Desde la fase 3 cubre: lecturas públicas (taller, servicios, campos, horarios), reserva por la RPC v2 con `datos_extra` y `token_publico`, **doce rechazos** con su código (`CT001`–`CT013`: festivo, fuera de horario, día pasado, más de 90 días, teléfono, matrícula, servicio, campos obligatorios y opciones, taller inexistente), hueco lleno, límite de 3 activas por teléfono, **concurrencia** (cuatro peticiones a la vez por dos huecos: entran dos), aislamiento entre talleres, confirmar y cancelar por las Edge Functions (`confirmar-reserva`, `cancelar-reserva`: estado, `confirmada_en`/`cancelada_por`, notificaciones, idempotencia, no reabrir), cita manual (`crear-reserva-taller`: sin teléfono, en hora llena, con campo extra, rechazos, taller ajeno), cancelación por el cliente (`consultar_cita_cliente` sin teléfono, `cancelar-cita-cliente` dentro de plazo, dos veces, token inventado, mal formado y a menos de 24 h), inicio del OAuth de Google y el secreto del cron. Al final cancela (y con `SR_KEY`, borra) lo creado; al empezar, cancela restos de ejecuciones anteriores. Necesita `E2E_TALLER_EMAIL` y `E2E_TALLER_PASSWORD` en `.env.local`.

Resultado del 21-sep-2026, con las cinco Edge Functions desplegadas: **64 de 64**, incluido un evento real creado y borrado en Google Calendar del taller de pruebas. (Antes del deploy eran 44 de 63: las 19 restantes eran exactamente las que llaman a `confirmar-reserva`, `cancelar-reserva`, `crear-reserva-taller` y `cancelar-cita-cliente`.) La prueba **se puede repetir el mismo día**: usa teléfonos distintos en cada ejecución, porque la RPC limita a 3 citas activas y 5 creaciones diarias por teléfono.

Lo único que no puede cubrir es la pantalla de permisos de Google, que exige que una persona autorice con su cuenta (hecho el 20-sep-2026 para el taller de pruebas). Aviso: con la app en estado "Prueba", el permiso caduca a los 7 días, así que hacia el 27-sep habrá que volver a conectar el taller de pruebas para que esta comprobación siga cubriendo Calendar.

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
- [ ] `/speedbikes`: se ve nombre, dirección y horario del taller. Los servicios del desplegable son los del seed (7).
- [ ] Speedbikes: aparece el campo Kilómetros (opcional, solo dígitos) antes del servicio. Rik and Roll y e2e: no.
- [ ] `/rikandroll` (y `/e2e`): al elegir Neumáticos aparecen cantidad (1-4, obligatoria), medidas obligatorias e imagen de ayuda; al cambiar de servicio se limpian.
- [ ] "Avería / luz de aviso" y "Otro" tienen descripción opcional con contador; el resto no muestra descripción.
- [ ] Sin rellenar todos los obligatorios, CONTINUAR está deshabilitado. Teléfono o matrícula mal escritos marcan error bajo el campo.
- [ ] Calendario: fines de semana y festivos deshabilitados; días sin horario deshabilitados.
- [ ] `/rikandroll` (y `/e2e`): con Neumáticos, la pantalla de fecha avisa "…necesitamos medio día… Primera hora disponible: …" y no ofrece ni días ni horas anteriores (solicitud por la noche → el día siguiente solo desde las 15:30; por la tarde → desde la mañana siguiente; por la mañana → desde esa tarde). Con otro servicio, todo igual que antes. Desde el panel, "Nueva cita" de Neumáticos a cualquier hora entra.
- [ ] Al elegir un día se listan las horas; una hora ya ocupada (o el día completo en Speedbikes, por día) no aparece.
- [ ] La última hora muestra el aviso de tarde (texto del taller si lo tiene).
- [ ] Resumen con los campos extra; ENVIAR crea la reserva **una sola vez** aunque se pulse dos veces; la pantalla final aparece solo después de guardar.
- [ ] Pantalla final: el texto depende del modo de WhatsApp del taller (solo promete WhatsApp en `api`) y muestra el **enlace de la cita** con botón "Copiar enlace".
- [ ] En Supabase: fila en `reservas` con `estado='Pendiente'`, `creada_por='cliente'`, `datos_extra`, `servicio_id` y teléfono normalizado (`34…`).

## B. Panel
- [ ] `/speedbikes/panel`: pide login. Credenciales de otro taller → mensaje de error.
- [ ] Tras login se ven las reservas del taller agrupadas por día; recargar la página mantiene la sesión sin parpadeo.
- [ ] Cabecera "Hoy: N por terminar · M por responder" (o "Hoy: todo terminado" / "todo al día").
- [ ] Pestañas Pendientes / Confirmadas / Finalizadas / Canceladas con su número, búsqueda por nombre/matrícula/vehículo, Hoy / Mañana / 7 días (no en Finalizadas).
- [ ] La tarjeta muestra teléfono (enlace `tel:`, sin el 34), los campos extra con su etiqueta y unidad, "Mostrador · Nombre" en las citas manuales y "Cancelada por el cliente" cuando toca.
- [ ] "Vehículo listo" en una confirmada de hoy: en modo `enlace` abre WhatsApp con "ya puedes recogerlo"; la cita pasa a Finalizadas con "✓ Lista · avisado a las HH:MM", "Deshacer" la devuelve a Confirmadas; la cabecera resta una.
- [ ] Finalizadas es el histórico: todas las hechas (también las confirmadas de días pasados sin marcar), el total en el botón, de la más reciente a la más antigua.
- [ ] Al pulsar "Avisar por WhatsApp" (o el recordatorio de mañana) la marca "✓ Confirmación enviada a las HH:MM" ocupa el sitio del botón (no se puede reenviar).
- [ ] Cerrar sesión vuelve al login.

## C. Confirmar
- [ ] Confirmar una pendiente: pasa a Confirmada; botones deshabilitados durante la operación; aparece el aviso de resultado.
- [ ] Rik and Roll (Google conectado): la reserva tiene `google_event_id` y el evento aparece en su Google Calendar con los campos extra en la descripción.
- [ ] Modo `api`: el cliente recibe la plantilla; `whatsapp_confirmacion_enviada=true`. Si Meta falla, el aviso lo dice y la tarjeta muestra el error; volver a pulsar Confirmar reintenta.
- [ ] Modo `enlace` (Speedbikes): el aviso trae el botón "Abrir WhatsApp con el mensaje", que abre WhatsApp con el texto y el enlace de la cita; la tarjeta tiene "Avisar por WhatsApp".
- [ ] Confirmar dos veces no duplica el evento ni el WhatsApp.

## D. Cancelar
- [ ] Cancelar una confirmada: pide confirmación; pasa a Cancelada (`cancelada_por='taller'`); el evento desaparece del calendario; `google_event_id` a null.
- [ ] Rechazar una pendiente también avisa al cliente (modo `api`: WhatsApp de cancelación; modo `enlace`: botón para abrir WhatsApp).
- [ ] Si Google falla, la cita se cancela igualmente y el fallo queda en la tarjeta.

## G. Cita manual
- [ ] "+ Nueva cita" abre el formulario dentro del panel: mismos campos que el público, servicio del taller, campos extra, teléfono opcional.
- [ ] Día y hora libres: una hora fuera del horario o ya llena muestra un aviso pero deja guardar. Un día festivo también avisa.
- [ ] Al guardar nace **Confirmada** con la etiqueta "Mostrador"; con teléfono se avisa según el modo; siempre va al calendario si está conectado.

## H. Cancelación por el cliente
- [ ] El enlace de la pantalla final (o del WhatsApp) abre `/<slug>/cita/<token>` con los datos de la cita, sin el teléfono.
- [ ] "Cancelar mi cita" pide confirmación y deja la cita "Cancelada por ti"; el panel la ve como "Cancelada por el cliente"; el evento desaparece del calendario; nadie recibe WhatsApp.
- [ ] Una cita a menos de 24 h muestra "Ya no se puede cancelar por internet" con el teléfono del taller.
- [ ] Un enlace inventado o de otro taller muestra "No encontramos ninguna cita".

## I. Promoción
- [ ] `clientes/<slug>/assets/qr-reserva.png` escaneado con el móvil abre el formulario del taller.
- [ ] El botón "Reservar" del perfil de Google Business del taller abre el formulario del taller.

## E. Conectar Google Calendar
- [ ] En el panel de Rik and Roll: "Conectar Google Calendar" lleva a Google, se acepta, y vuelve al panel con `calendar=connected`.
- [ ] `integraciones_calendario.conectado=true` y `updated_at` reciente.

## F. Recordatorios
- [ ] Invocación manual de la función de recordatorios con el secreto devuelve `ok: true`.
- [ ] A la mañana siguiente, `net._http_response` muestra 200 para el job del cron.

## J. Despliegue
- [ ] Preview de Vercel construye sin errores y carga con las variables de entorno.
- [ ] `?taller=2&modo=taller` redirige a `/rikandroll/panel`.
- [ ] `/rikandroll/cita/<token>` de una reserva real abre la cita.

## K. Sitio (página principal y privacidad)
- [ ] `/` sin parámetros abre la página principal de CiTaller (no la de "taller no encontrado") y el botón "Escríbenos" abre el correo de contacto.
- [ ] `/privacidad` abre la política, con los apartados "Google Calendar" y "Tus derechos", y vuelve a `/` desde el pie.
- [ ] En la página de reserva de un taller, la firma "Reservas gestionadas con CiTaller · Privacidad" enlaza a `/privacidad`.
