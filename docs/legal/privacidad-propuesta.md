# Propuesta: nueva política de privacidad (`/privacidad`)

> **Borrador para revisar (25-sep-2026).** Cuando Miguel lo apruebe, este texto sustituye al de
> `src/features/sitio/PrivacidadPage.tsx` y se cambia `RESPONSABLE` en `src/features/sitio/contacto.ts`.

## Qué cambia respecto a la versión publicada (21-sep-2026)

1. **Quién es el responsable.** Hoy dice "CiTaller" en todo. Ahora se separan dos casos: para los
   datos de quien pide cita, el responsable es **el taller** y CiTaller es su proveedor (encargado);
   para los datos de los talleres, el responsable es CiTaller.
2. **Titular con nombre.** Se pone el nombre de Miguel (el DNI y el domicilio se añaden cuando se dé
   de alta como autónomo).
3. **Google Calendar.** Hoy dice que el evento lleva "nombre, vehículo y servicio", pero también lleva
   **teléfono, matrícula y descripción**. Se corrige.
4. **Proveedores** con nombre, y **conservación** con plazos concretos.
5. **Primera capa en el formulario de reserva** (texto nuevo, ver al final).

---

## Texto nuevo de la página

### Política de privacidad

*Última actualización: [fecha de publicación]*

#### Quién es quién

CiTaller es un servicio de reserva de citas para talleres de vehículos, ofrecido por
**Miguel Ángel Rodríguez Sevilla** (contacto: hola@citaller.es).

- **Si pides cita en un taller**, quien decide sobre tus datos es **ese taller** (su nombre aparece en
  la página donde reservas). CiTaller es la herramienta que usa el taller y trata tus datos solo por
  su cuenta y siguiendo sus instrucciones.
- **Si eres un taller que usa CiTaller**, quien decide sobre tus datos de acceso es CiTaller.

#### Si pides cita en un taller

**Qué datos guardamos:** lo que escribes en el formulario del taller: tu nombre y apellido, tu
teléfono, la matrícula, la marca y el modelo del vehículo, el servicio que pides, el día y la hora, la
descripción que añadas y, si el taller los pide, datos como los kilómetros o la medida del neumático.
También guardamos el estado de la cita y qué avisos te han llegado.

**Para qué:** solo para gestionar tu cita: que el taller la reciba y te la confirme, que pueda
avisarte si algo cambia, recordártela y avisarte cuando tu vehículo esté listo. El taller conserva el
historial de citas de tu vehículo para atenderte mejor la próxima vez.

**Por qué podemos:** porque tú pides la cita, y para gestionarla hacen falta estos datos (art. 6.1.b
del RGPD). No usamos tus datos para publicidad ni los vendemos.

**Avisos por WhatsApp:** llegan al teléfono que indicas. Según el taller, los envía el propio taller
desde su móvil o los envía CiTaller de forma automática a través de WhatsApp Business (Meta); en ese
caso, Meta recibe tu número y el texto del mensaje para entregarlo. El remitente es siempre el número
del taller.

**Tu enlace de cita:** la página de tu cita se abre con un enlace que lleva un código que solo tienes
tú. Desde ahí puedes consultarla o cancelarla. No lo compartas.

#### Si eres un taller

Guardamos tu correo y tu contraseña (cifrada) para entrar en el panel, los nombres de los mecánicos
que apuntan citas y los datos de tu taller que aparecen en tu página de reserva (nombre, dirección,
teléfono, horarios). Los usamos para darte el servicio y para hablar contigo sobre él.

#### Google Calendar

Si un taller conecta su Google Calendar, CiTaller pide a Google permiso para gestionar eventos de ese
calendario (permiso `calendar.events`). Ese permiso se usa exclusivamente para:

- Crear un evento por cada cita confirmada, con el servicio, el nombre y el teléfono del cliente, el
  vehículo, la matrícula, los datos adicionales de la cita y la descripción.
- Actualizar o borrar ese evento cuando la cita cambia o se cancela.

CiTaller no lee los demás eventos del calendario, no los guarda y no comparte con terceros ninguna
información obtenida de Google. La autorización de Google se guarda cifrada y solo la usan los procesos
que crean y borran esos eventos. El taller puede retirar el permiso cuando quiera en
https://myaccount.google.com/permissions o pidiéndolo por correo.

El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google
por parte de CiTaller se ajustan a la Política de datos de usuario de los servicios de API de Google,
incluidos los requisitos de uso limitado.

#### Dónde se guardan y quién los ve

Los datos se guardan en servidores de **Supabase en la Unión Europea (París)**. La web se sirve desde
**Vercel**. Si el taller usa avisos automáticos, intervienen **Meta (WhatsApp Business)** y, si
escribes a hola@citaller.es, nuestro proveedor de correo. Cuando alguno de estos proveedores trata
datos fuera de la UE, lo hace con las garantías del RGPD (Marco de Privacidad de Datos UE-EE. UU. o
cláusulas contractuales tipo).

Solo ven los datos de una cita el taller en el que reservas y quien mantiene CiTaller, y este último
solo cuando hace falta para que el servicio funcione. Todas las comunicaciones van cifradas (HTTPS).

#### Cuánto tiempo

- Las citas se conservan mientras el taller use CiTaller, porque forman su historial.
- Si el taller deja CiTaller, sus citas se le entregan y se borran en 30 días (de las copias de
  seguridad, en 90 días).
- Puedes pedir que se borren las tuyas en cualquier momento.

#### Tus derechos

Puedes pedir acceder a tus datos, corregirlos, borrarlos, limitar su uso, oponerte o llevártelos.
Puedes pedirlo **al taller** o escribir a hola@citaller.es: si nos escribes, se lo pasamos al taller y
le ayudamos a responderte. La respuesta te llegará como mucho en un mes. Si crees que no se ha atendido
bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

#### Cookies

No usamos cookies de seguimiento ni herramientas de analítica. Si eres un taller, mientras tengas la
sesión abierta el navegador guarda un identificador de sesión, imprescindible para que el panel
funcione; por eso no pedimos consentimiento.

#### Cambios

Si cambiamos algo, lo publicaremos aquí con la fecha de la revisión.

---

## Primera capa en el formulario de reserva (texto nuevo)

Una línea pequeña justo encima del botón de enviar, en la web pública y no en el mostrador del panel:

> Tus datos los trata **[nombre del taller]** para gestionar tu cita, con CiTaller como proveedor. No
> se usan para publicidad. Puedes acceder a ellos, corregirlos o borrarlos. [Más información](/privacidad)

Sin casilla de "acepto": no hace falta, porque los datos se usan solo para la cita que el cliente pide.
Si algún día se quieren usar para otra cosa (por ejemplo, avisar de la ITV), entonces sí haría falta
una casilla aparte, opcional y desmarcada.
