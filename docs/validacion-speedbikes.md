# Media hora con la dueña de Speedbikes

Objetivo: ver cómo usa la web una persona del taller sin que nadie le explique nada, y decidir con eso
qué se construye después (cambiar de hora, "listo para recoger", avisos). Media hora, en su taller,
con **su móvil**.

## Antes de ir

- [ ] La web está en producción: `https://citaller.vercel.app/speedbikes` abre el formulario y
      `https://citaller.vercel.app/speedbikes/panel` su panel (usuario y contraseña de Speedbikes).
- [ ] Si vais a conectar su Google Calendar: su cuenta de Google tiene que estar añadida antes como
      **usuario de prueba** en Google Cloud (proyecto `citaller-508917` → pantalla de consentimiento →
      usuarios de prueba). Sin eso, Google le dirá que no tiene acceso. Y mientras la app esté en
      "Prueba", el permiso caduca a los 7 días: hay que volver a pulsar "Conectar" cada semana.
- [ ] Llevar impreso o en el móvil el QR de `clientes/speedbikes/assets/qr-reserva.png`.

## Parte 1 (10 min): ella como cliente

Dale el QR o el enlace y dile solo: "pide una cita como si fueras un cliente". No le expliques nada.
Apunta dónde se para, qué pregunta y qué no entiende. Cosas concretas en las que fijarse:

- ¿Entiende que la primera pantalla es de **su** taller? (Ahora el nombre del taller es el título.)
- ¿Sabe qué poner en Vehículo? ¿Le sobra o le falta algún campo (kilómetros)?
- En el calendario: ¿entiende por qué hay días en gris?
- Al terminar: ¿lee lo del enlace de la cita? ¿Lo guardaría? ¿Dónde?

## Parte 2 (10 min): ella como taller

Que entre en su panel desde el móvil y vea la solicitud que acaba de hacer. Sin explicar:

- ¿Encuentra cómo confirmarla? ¿Entiende el aviso que sale después?
- Pulsa "Avisar por WhatsApp": ¿le parece bien el mensaje? ¿Lo enviaría tal cual o lo cambiaría?
- Que apunte una cita a mano de alguien que "acaba de entrar por la puerta" (+ Nueva cita).
- Que cancele una cita: ¿le queda claro que el cliente recibe (o no) un aviso?
- Si quiere, conectar su Google Calendar y confirmar una cita: que la vea aparecer en su calendario.

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

- Anotar lo que salga en `docs/idea.md` (sección nueva "Validación con Speedbikes, <fecha>").
- Con eso se decide el orden de la fase 5 de `docs/plan.md`.
