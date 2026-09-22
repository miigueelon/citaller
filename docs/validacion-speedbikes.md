# Instalar CiTaller en Speedbikes y Rik and Roll

Guion para la visita a cada taller (media hora por taller, con **el móvil de la persona del taller**).
Objetivo doble: dejar el panel funcionando en su móvil y ver cómo lo usa sin que nadie le explique
nada, para decidir qué se construye después (cambiar de hora, caducidad de solicitudes, avisos) y
cuáles de las mejoras de diseño apuntadas (M1–M10) merecen la pena.

Regla de oro: **mirar, no enseñar**. Si se atasca, espera; si pregunta, devuélvele la pregunta
("¿tú qué harías?"). Lo que más vale es dónde duda.

## Qué tiene cada taller

| | Speedbikes (motos) | Rik and Roll (coches) |
|---|---|---|
| Formulario | `https://citaller.es/speedbikes` | `https://citaller.es/rikandroll` |
| Panel | `https://citaller.es/speedbikes/panel` | `https://citaller.es/rikandroll/panel` |
| Huecos | 6 citas al día, a cualquier hora | 2 por hora y máximo 5 al día |
| Campo extra | Kilómetros (opcional) | Neumáticos: cantidad y medidas, con imagen de ayuda |
| WhatsApp | Modo enlace: el panel abre WhatsApp con el mensaje escrito y ella lo envía desde su móvil | Igual (modo enlace), hasta que tenga WhatsApp Business |
| Google Calendar | Sin conectar (opcional) | Conectado el 17-sep con la app de Google en "Prueba": **hay que reconectarlo mañana** (parte 2) |
| "Vehículo listo" | "Tu moto ya está lista…" | "Tu coche ya está listo…" |
| QR | `clientes/speedbikes/assets/qr-reserva.png` | `clientes/rikandroll/assets/qr-reserva.png` |

Ninguno de los dos tiene mecánicos cargados: "Nueva cita" no pregunta quién la apunta. Si quieren
que se sepa quién apuntó cada cita, se cargan los nombres después (`docs/operaciones.md`, "Mecánicos").

## Antes de ir

- [ ] En tu móvil abren el formulario y el panel de cada taller (`citaller.vercel.app` sigue
      funcionando, pero enséñales siempre `citaller.es`).
- [ ] **Email y contraseña** del panel de cada taller: que los tengan ellos o llévalos tú. No hay
      botón de "he olvidado mi contraseña"; si nadie la recuerda, avisa antes de ir y se cambia.
- [x] Talleres sin citas de prueba: las 9 del 21-sep se borraron el 22-sep (copia en
      `backups/2026-09-21_2343`). Los dos paneles empiezan vacíos. Si hicieras más pruebas antes de
      ir, cancélalas desde el panel: no uses "Vehículo listo", que las da por hechas y no libera el hueco.
- [ ] Los QR impresos o en el móvil.
- [ ] Google: la app ya está publicada (no hace falta "usuario de prueba" y el permiso ya no caduca a
      los 7 días). Google enseña "Google no ha verificado esta aplicación": es normal; se pulsa
      **Configuración avanzada → Ir a citaller.es (no seguro)** y después **Permitir**.
- [ ] Límite para la demo: con **un mismo móvil** se pueden pedir como mucho 5 citas al día por taller
      y tener 3 activas a la vez (protección contra abusos). El mostrador ("Nueva cita") no tiene límite.
- [ ] Solo para ti: la galería con las 10 mejoras numeradas,
      https://claude.ai/artifact/GTufaQtrN4uz5i2thYZypD (en este guion, (M1)…(M10); M5 y M7 no se ven
      en una visita).

## Parte 1 (10 min): la persona del taller como cliente

Dale el QR o el enlace y dile solo: "pide una cita como si fueras un cliente". Que ponga **su
teléfono de verdad** (así, en la parte 2, los botones de WhatsApp le abren el mensaje a ella misma).
No le expliques nada. Apunta dónde se para, qué pregunta y qué no entiende:

- ¿Entiende que la primera pantalla es de **su** taller? (El nombre del taller es el título, con el
  logo de CiTaller pequeño encima.) ¿Lee la dirección y el horario de arriba o baja directamente? (M10)
- ¿Sabe qué poner en Vehículo? Speedbikes: ¿rellena los kilómetros o se los salta? (M1) Rik and Roll:
  con "Neumáticos", ¿entiende la cantidad y las medidas con la imagen?
- ¿Busca el servicio antes que sus datos? ¿Le extraña el orden? (M2)
- En el calendario: ¿entiende por qué hay días en gris? (Fines de semana, festivos y más de 90 días.)
- Al terminar: ¿lee lo del enlace de la cita? ¿Lo guardaría? ¿Dónde?

## Parte 2 (10 min): como taller, en su móvil

Que entre en su panel y busque la solicitud que acaba de hacer (pestaña **Pendientes**). Sin explicar:

- ¿Qué mira primero en la tarjeta: el nombre, la hora, el teléfono? (M6) ¿Qué datos le sobran?
  ¿Tiene que bajar mucho para ver otra cita? (M3)
- ¿Toca los botones de arriba (Actualizar, Conectar Google Calendar) o los ignora? (M4)
- ¿Qué cree que significan las pestañas **Pendientes · Confirmadas · Finalizadas · Canceladas** (con
  su número), la línea bajo el nombre del taller ("Hoy: N por terminar · M por responder"), los botones
  Hoy / Mañana / Próximos 7 días y el buscador? (M8, M9)
- ¿Encuentra cómo **confirmar**? ¿Entiende el aviso que sale después, con el botón "Abrir WhatsApp con
  el mensaje"? Al pulsarlo se abre WhatsApp con el texto y la tarjeta queda "✓ Confirmación enviada a
  las HH:MM" en el sitio del botón (no se puede reenviar). ¿Le parece bien el mensaje? ¿Lo enviaría tal cual?
- **Rik and Roll**: ahora, antes de seguir, que pulse "Conectar Google Calendar" (su conexión anterior
  caduca el 24-sep). Google → Configuración avanzada → Ir a citaller.es → Permitir → vuelve al panel
  con "Google Calendar conectado". (Speedbikes: solo si lo quiere.) La cita que ya confirmó no
  aparecerá en el calendario —el evento se crea al confirmar—; las siguientes sí.
- Que apunte una cita a mano de alguien que "acaba de entrar por la puerta" (+ Nueva cita), **para
  hoy**. Nace confirmada, con la etiqueta "Mostrador". Si tiene calendario, que la vea aparecer en él.
- **Vehículo listo**: en esa cita de hoy, que pulse "Vehículo listo: avisar por WhatsApp". Se abre
  WhatsApp con "tu moto / tu coche ya está…"; la cita pasa a **Finalizadas** con "✓ Lista · avisado a
  las HH:MM" y el número de arriba baja. ¿Lo entiende? Que pruebe **Deshacer** (vuelve a Confirmadas)
  y lo marque otra vez.
- Que abra **Finalizadas**: es el registro histórico de todas las citas hechas, con el total en el
  botón y el buscador.
- Si tiene citas confirmadas para mañana, arriba sale "Recordatorios para mañana (N por enviar)" con un
  botón por cita: al pulsarlo se abre WhatsApp y queda "✓ Recordatorio enviado a las HH:MM".
- Que cancele **la cita de la web** (la de la parte 1): pide confirmación, pasa a Canceladas y ofrece
  "Avisar de la cancelación". ¿Le queda claro que el cliente recibe (o no) un aviso? Con el calendario
  conectado, el evento desaparece solo.
- Para no dejar la cita de mostrador de prueba en su histórico: en Finalizadas → **Deshacer** → en
  Confirmadas → **Cancelar cita**.

## Parte 3 (10 min): tres preguntas

Apunta las respuestas literales, no las resumas.

1. Cuando un cliente no puede venir, ¿qué prefieres: que **cancele** y ya, o que pueda **cambiar de
   hora** él mismo? ¿Te molestaría que una cita cambiada te volviera a aparecer como pendiente?
2. El botón "Vehículo listo" que acaba de usar: ¿le sirve tal cual? ¿Cuántas llamadas o WhatsApps al
   día se ahorra? ¿Preferiría que el aviso saliera solo, sin tener que pulsar "enviar" en WhatsApp?
3. ¿Con cuánta antelación te sirve que un cliente cancele por internet? (Hoy: hasta 24 h antes;
   después, solo llamando.) ¿Y una solicitud que nadie confirma, cuánto tiempo debería reservar el
   hueco antes de caducar sola?

Extra si hay tiempo: ¿cómo quiere enterarse de que ha entrado una solicitud nueva? (Opciones que
tenemos: que aparezca en su Google Calendar como "PENDIENTE", en rojo en el panel, o nada.)

## Después

- [ ] En cada panel, las citas de prueba salen como canceladas (ni en Confirmadas ni en Finalizadas):
      si no, ocupan hueco y cuentan en el histórico.
- [ ] Rik and Roll: la cita de mostrador apareció en su Google Calendar (= reconexión hecha; el token
      ya está en Vault). Borrar a mano los 4 eventos huérfanos de su calendario (22-sep 8:30 y
      12:30, 23-sep 10:30, 19-oct 9:30: sus citas ya no existen) y poner el enlace de reserva en su
      Google Business (plan 4.3).
- [ ] Pasar las notas literales, sin resumir, a `docs/idea.md` (sección nueva "Validación con
      <taller>, <fecha>"). Con eso se decide el orden de la fase 5 de `docs/plan.md` y qué mejoras
      (M1–M10) se hacen.
- [ ] Si entraste en su panel desde tu móvil, "Cerrar sesión" solo cierra tu aparato: el suyo sigue
      dentro.
