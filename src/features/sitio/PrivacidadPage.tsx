import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CORREO_CONTACTO, POLITICA_ACTUALIZADA, RESPONSABLE } from "./contacto";
import estilos from "./sitio.module.css";

const POLITICA_GOOGLE = "https://developers.google.com/terms/api-services-user-data-policy";
const PERMISOS_GOOGLE = "https://myaccount.google.com/permissions";

/**
 * Política de privacidad (`/privacidad`). La exige Google para publicar la app de Calendar y el RGPD
 * para los datos que dejan los clientes al reservar. Escrita para que la entienda quien reserva:
 * cada apartado dice qué datos se guardan, para qué y cómo pedir que se borren. Separa los dos
 * papeles: de los datos de quien reserva responde el taller (CiTaller es su encargado); de los datos
 * de los talleres responde CiTaller. Borrador y razones en `docs/legal/privacidad-propuesta.md`.
 */
export function PrivacidadPage() {
  const correo = <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>;

  return (
    <main className={estilos.pagina}>
      <div className={estilos.tarjeta}>
        <Link to="/" className={estilos.volver}>
          <ArrowLeft size={16} aria-hidden="true" />
          CiTaller
        </Link>
        <h1 className={estilos.titulo}>Política de privacidad</h1>
        <p className={estilos.actualizada}>Última actualización: {POLITICA_ACTUALIZADA}</p>

        <article className={estilos.articulo}>
          <h2>Quién es quién</h2>
          <p>
            CiTaller es un servicio de reserva de citas para talleres de vehículos, ofrecido por{" "}
            <strong>{RESPONSABLE}</strong> (contacto: {correo}).
          </p>
          <ul>
            <li>
              <strong>Si pides cita en un taller</strong>, quien decide sobre tus datos es ese taller (su nombre
              aparece en la página donde reservas). CiTaller es la herramienta que usa el taller y trata tus datos
              solo por su cuenta y siguiendo sus instrucciones.
            </li>
            <li>
              <strong>Si eres un taller que usa CiTaller</strong>, quien decide sobre tus datos de acceso es
              CiTaller.
            </li>
          </ul>

          <h2>Si pides cita en un taller</h2>
          <p>
            <strong>Qué datos guardamos:</strong> lo que escribes en el formulario del taller: tu nombre y apellido,
            tu teléfono, la matrícula, la marca y el modelo del vehículo, el servicio que pides, el día y la hora, la
            descripción que añadas y, si el taller los pide, datos como los kilómetros o la medida del neumático.
            También guardamos el estado de la cita y qué avisos te han llegado.
          </p>
          <p>
            <strong>Para qué:</strong> solo para gestionar tu cita: que el taller la reciba y te la confirme, que
            pueda avisarte si algo cambia, recordártela y avisarte cuando tu vehículo esté listo. El taller conserva
            el historial de citas de tu vehículo para atenderte mejor la próxima vez.
          </p>
          <p>
            <strong>Por qué podemos:</strong> porque tú pides la cita, y para gestionarla hacen falta estos datos
            (artículo 6.1.b del RGPD). No usamos tus datos para publicidad ni los vendemos.
          </p>
          <p>
            <strong>Avisos por WhatsApp:</strong> llegan al teléfono que indicas. Según el taller, los envía el
            propio taller desde su móvil o los envía CiTaller de forma automática a través de WhatsApp Business
            (Meta); en ese caso, Meta recibe tu número y el texto del mensaje para entregarlo. El remitente es
            siempre el número del taller.
          </p>
          <p>
            <strong>Tu enlace de cita:</strong> la página de tu cita se abre con un enlace que lleva un código que
            solo tienes tú. Desde ahí puedes consultarla o cancelarla. No lo compartas.
          </p>

          <h2>Si eres un taller</h2>
          <p>
            Guardamos tu correo y tu contraseña (cifrada) para entrar en el panel, los nombres de los mecánicos que
            apuntan citas y los datos de tu taller que aparecen en tu página de reserva (nombre, dirección, teléfono,
            horarios). Los usamos para darte el servicio y para hablar contigo sobre él.
          </p>

          <h2>Google Calendar</h2>
          <p>
            Si un taller conecta su Google Calendar, CiTaller pide a Google permiso para gestionar los eventos de ese
            calendario (permiso <code>calendar.events</code>). Ese permiso se usa exclusivamente para:
          </p>
          <ul>
            <li>
              Crear un evento por cada cita confirmada, con el servicio, el nombre y el teléfono del cliente, el
              vehículo, la matrícula, los datos adicionales de la cita y la descripción.
            </li>
            <li>Actualizar o borrar ese evento cuando la cita cambia o se cancela.</li>
          </ul>
          <p>
            CiTaller no lee los demás eventos del calendario, no los guarda y no comparte con terceros ninguna
            información obtenida de Google. La autorización que concede Google se guarda cifrada y solo la usan los
            procesos que crean y borran esos eventos. El taller puede retirar el permiso en cualquier momento desde
            su cuenta de Google, en{" "}
            <a href={PERMISOS_GOOGLE} target="_blank" rel="noreferrer">
              {PERMISOS_GOOGLE}
            </a>
            , o pidiéndolo por correo; a partir de ese momento las citas dejan de apuntarse en su calendario.
          </p>
          <p>
            El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google por
            parte de CiTaller se ajustan a la{" "}
            <a href={POLITICA_GOOGLE} target="_blank" rel="noreferrer">
              Política de datos de usuario de los servicios de API de Google
            </a>
            , incluidos los requisitos de uso limitado.
          </p>

          <h2>Dónde se guardan y quién los ve</h2>
          <p>
            Los datos se guardan en servidores de <strong>Supabase en la Unión Europea (París)</strong>. La web se
            sirve desde <strong>Vercel</strong>. Si el taller usa avisos automáticos, interviene{" "}
            <strong>Meta (WhatsApp Business)</strong> y, si escribes a {correo}, nuestro proveedor de correo. Cuando
            alguno de estos proveedores trata datos fuera de la Unión Europea, lo hace con las garantías del RGPD
            (Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo).
          </p>
          <p>
            Solo ven los datos de una cita el taller en el que reservas y quien mantiene CiTaller, y este último solo
            cuando hace falta para que el servicio funcione. Todas las comunicaciones van cifradas (HTTPS).
          </p>

          <h2>Cuánto tiempo</h2>
          <ul>
            <li>Las citas se conservan mientras el taller use CiTaller, porque forman su historial.</li>
            <li>
              Si el taller deja CiTaller, se le entregan sus citas y se borran en 30 días (de las copias de
              seguridad, en 90 días).
            </li>
            <li>Puedes pedir que se borren las tuyas en cualquier momento.</li>
          </ul>

          <h2>Tus derechos</h2>
          <p>
            Puedes pedir acceder a tus datos, corregirlos, borrarlos, limitar su uso, oponerte a él o llevártelos.
            Puedes pedirlo al taller o escribir a {correo}: si nos escribes, se lo pasamos al taller y le ayudamos a
            responderte. La respuesta te llegará como mucho en un mes. Si crees que no se ha atendido bien tu
            petición, puedes reclamar ante la Agencia Española de Protección de Datos (
            <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
              www.aepd.es
            </a>
            ).
          </p>

          <h2>Cookies</h2>
          <p>
            No usamos cookies de seguimiento ni herramientas de analítica. Si eres un taller, mientras tengas la sesión
            abierta el navegador guarda un identificador de sesión, imprescindible para que el panel funcione; por eso
            no pedimos consentimiento.
          </p>

          <h2>Cambios en esta política</h2>
          <p>
            Si cambiamos algo, lo publicaremos en esta misma página con la fecha de la revisión. La versión vigente es
            siempre la que aparece aquí.
          </p>
        </article>

        <footer className={estilos.pie}>
          <span>© {new Date().getFullYear()} CiTaller</span>
          <Link to="/">Página principal</Link>
        </footer>
      </div>
    </main>
  );
}
