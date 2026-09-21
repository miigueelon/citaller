# Media hora con la dueña de Speedbikes

Objetivo: ver cómo usa la web una persona del taller sin que nadie le explique nada, y decidir con
eso qué se construye después (cambiar de hora, "listo para recoger", avisos) y cuáles de las 10
mejoras de diseño apuntadas merecen la pena. Media hora, en su taller, con **su móvil**.

Regla de oro: **mirar, no enseñar**. Si se atasca, espera; si pregunta, devuélvele la pregunta
("¿tú qué harías?"). Lo que más vale es dónde duda.

## Antes de ir

- [ ] En tu móvil abren `https://citaller.es/speedbikes` (formulario) y
      `https://citaller.es/speedbikes/panel` (su panel). `citaller.vercel.app` sigue funcionando,
      pero enséñale siempre `citaller.es`.
- [ ] Su **email y contraseña** del panel: que los tenga ella o llévalos tú. No hay botón de "he
      olvidado mi contraseña"; si nadie la recuerda, avisa antes de ir y se cambia.
- [ ] Si vais a conectar su Google Calendar: pídele antes su Gmail y añádelo como **usuario de
      prueba** en Google Cloud (proyecto `citaller-508917` → pantalla de consentimiento → usuarios de
      prueba). Sin eso, Google le dirá que no tiene acceso. Si para entonces ya se ha publicado la app
      de Google, este paso sobra. En los dos casos Google enseña "Google no ha verificado esta
      aplicación": es normal, se pulsa **Continuar**. Mientras la app siga en "Prueba", el permiso
      caduca a los 7 días y hay que volver a pulsar "Conectar Google Calendar".
- [ ] El QR de `clientes/speedbikes/assets/qr-reserva.png` (lleva a `citaller.es/speedbikes`),
      impreso o en el móvil.
- [ ] La galería de pantallas con las 10 mejoras numeradas, para ti, no para ella:
      https://claude.ai/artifact/GTufaQtrN4uz5i2thYZypD. En este guion salen como (M1)…(M10); M5 y
      M7 (estilo de las etiquetas, icono repetido) no se ven en una visita y no aparecen.

## Parte 1 (10 min): ella como cliente

Dale el QR o el enlace y dile solo: "pide una cita como si fueras un cliente". Que ponga **su
teléfono de verdad** (así, en la parte 2, "Avisar por WhatsApp" le abre el mensaje a ella misma).
No le expliques nada. Apunta dónde se para, qué pregunta y qué no entiende:

- ¿Entiende que la primera pantalla es de **su** taller? (El nombre del taller es el título, con el
  logo de CiTaller pequeño encima.) ¿Lee la dirección y el horario de arriba o baja directamente? (M10)
- ¿Sabe qué poner en Vehículo? ¿Rellena los kilómetros o se los salta como si ya estuvieran
  puestos? (M1)
- ¿Busca el servicio antes que sus datos? ¿Le extraña que pida los kilómetros antes de saber a qué
  viene? (M2)
- En el calendario: ¿entiende por qué hay días en gris?
- Al terminar: ¿lee lo del enlace de la cita? ¿Lo guardaría? ¿Dónde?

## Parte 2 (10 min): ella como taller

Que entre en su panel desde el móvil y busque la solicitud que acaba de hacer. Sin explicar:

- ¿Qué mira primero en la tarjeta: el nombre, la hora, el teléfono? (M6) ¿Qué datos le sobran?
  ¿Tiene que bajar mucho para ver otra cita? (M3)
- ¿Toca los botones de arriba (Actualizar, Conectar Google Calendar) o los ignora? (M4) ¿Qué cree
  que significan los filtros y el número que sale bajo el nombre del taller? (M8, M9)
- ¿Encuentra cómo confirmarla? ¿Entiende el aviso que sale después?
- Pulsa "Avisar por WhatsApp": ¿le parece bien el mensaje? ¿Lo enviaría tal cual o lo cambiaría?
- Si quiere Google Calendar, conectarlo **ahora**, antes de la cita de mostrador. (La cita que ya
  confirmó no aparecerá en su calendario: el evento se crea al confirmar.)
- Que apunte una cita a mano de alguien que "acaba de entrar por la puerta" (+ Nueva cita). Si
  conectó el calendario, que la vea aparecer en él.
- Que cancele **las dos citas de prueba** (la suya y la de mostrador): ¿le queda claro que el
  cliente recibe (o no) un aviso? Si tenía el calendario conectado, el evento desaparece solo.

## Parte 3 (10 min): tres preguntas

Apunta las respuestas literales, no las resumas.

1. Cuando un cliente no puede venir, ¿qué prefieres: que **cancele** y ya, o que pueda **cambiar de
   hora** él mismo? ¿Te molestaría que una cita cambiada te volviera a aparecer como pendiente?
2. ¿Cuántas llamadas o WhatsApps haces al día para decir "tu moto está lista"? ¿Te serviría un botón
   que abra WhatsApp con ese mensaje ya escrito?
3. ¿Con cuánta antelación te sirve que un cliente cancele por internet? (Hoy: hasta 24 h antes;
   después, solo llamando.) ¿Y una solicitud que nadie confirma, cuánto tiempo debería reservar el
   hueco antes de caducar sola?

Extra si hay tiempo: ¿cómo quiere enterarse de que ha entrado una solicitud nueva? (Opciones que
tenemos: que aparezca en su Google Calendar como "PENDIENTE", en rojo en el panel, o nada.)

## Después

- [ ] En el panel, las dos citas de prueba salen como canceladas (si no, ocupan uno de sus 6 huecos
      del día).
- [ ] Pasar las notas literales, sin resumir, a `docs/idea.md` (sección nueva "Validación con
      Speedbikes, <fecha>"). Con eso se decide el orden de la fase 5 de `docs/plan.md` y qué
      mejoras (M1–M10) se hacen.
- [ ] Si conectó su Google Calendar y la app sigue en "Prueba": apuntar la fecha + 7 días para
      reconectarlo.
