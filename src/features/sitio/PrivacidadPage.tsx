import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CORREO_CONTACTO, POLITICA_ACTUALIZADA, RESPONSABLE } from "./contacto";
import estilos from "./sitio.module.css";

const POLITICA_GOOGLE = "https://developers.google.com/terms/api-services-user-data-policy";
const PERMISOS_GOOGLE = "https://myaccount.google.com/permissions";

/**
 * Política de privacidad (`/privacidad`). La exige Google para publicar la app de Calendar y el RGPD
 * para los datos que dejan los clientes al reservar. Escrita para que la entienda quien reserva:
 * cada apartado dice qué datos se guardan, para qué y cómo pedir que se borren.
 */
export function PrivacidadPage() {
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
          <h2>Quién trata tus datos</h2>
          <p>
            CiTaller es un servicio de reserva de citas para talleres de vehículos. El responsable del
            tratamiento es <strong>{RESPONSABLE}</strong>. Para cualquier consulta sobre tus datos escribe a{" "}
            <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
          </p>

          <h2>Si pides cita en un taller</h2>
          <p>Para gestionar tu cita guardamos lo que escribes en el formulario del taller:</p>
          <ul>
            <li>Tu nombre y tu número de teléfono.</li>
            <li>
              La matrícula y el modelo del vehículo, el servicio que pides y, si el taller lo necesita, datos
              como los kilómetros o la medida del neumático.
            </li>
            <li>El día y la hora de la cita y lo que añadas en la descripción.</li>
          </ul>
          <p>
            Estos datos sirven solo para que el taller atienda tu cita: que te la confirme, que pueda
            avisarte si hay algún cambio y que te recuerde la cita el día antes. No los usamos para
            publicidad ni los cedemos a nadie más que al taller en el que reservas. El taller es quien
            decide sobre tu cita; CiTaller guarda y trata los datos por cuenta del taller para que la
            reserva funcione.
          </p>
          <p>
            Los avisos llegan por WhatsApp al teléfono que indicas. Según el taller, los envía el propio
            taller desde su móvil o los envía CiTaller de forma automática a través de la plataforma
            WhatsApp Business de Meta; en este último caso, Meta recibe tu número y el texto del mensaje
            para entregarlo. En ambos casos el remitente es el número del taller.
          </p>
          <p>
            La página de tu cita se abre con un enlace que lleva un código que solo conoces tú. Desde ahí
            puedes consultarla o cancelarla. No compartas ese enlace con nadie.
          </p>

          <h2>Si eres un taller</h2>
          <p>
            Para entrar en el panel guardamos tu correo electrónico y tu contraseña (cifrada), y los datos
            del taller que aparecen en tu página de reserva: nombre, dirección, teléfono y horarios. Mientras
            tengas la sesión abierta, el navegador conserva un identificador de sesión; no usamos cookies
            de seguimiento ni herramientas de analítica.
          </p>

          <h2>Google Calendar</h2>
          <p>
            Si un taller conecta su Google Calendar, CiTaller pide a Google permiso para gestionar los
            eventos de ese calendario (permiso <code>calendar.events</code>). Ese permiso se usa
            exclusivamente para:
          </p>
          <ul>
            <li>Crear un evento por cada cita confirmada, con el nombre del cliente, el vehículo y el servicio.</li>
            <li>Actualizar o borrar ese evento cuando la cita cambia o se cancela.</li>
          </ul>
          <p>
            CiTaller no lee los demás eventos del calendario, no los guarda y no comparte con terceros
            ninguna información obtenida de Google. La autorización que concede Google se guarda cifrada y
            solo la usan los procesos que crean y borran esos eventos. El taller puede retirar el permiso
            en cualquier momento desde su cuenta de Google, en{" "}
            <a href={PERMISOS_GOOGLE} target="_blank" rel="noreferrer">
              {PERMISOS_GOOGLE}
            </a>
            , o pidiéndolo por correo; a partir de ese momento las citas dejan de apuntarse en su calendario.
          </p>
          <p>
            El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de
            Google por parte de CiTaller se ajustan a la{" "}
            <a href={POLITICA_GOOGLE} target="_blank" rel="noreferrer">
              Política de datos de usuario de los servicios de API de Google
            </a>
            , incluidos los requisitos de uso limitado.
          </p>

          <h2>Dónde se guardan y quién puede verlos</h2>
          <p>
            Los datos se guardan en servidores de Supabase situados en la Unión Europea (París) y la web se
            sirve desde Vercel. Solo el taller en el que reservas y las personas que mantienen CiTaller
            pueden acceder a los datos de una cita, y únicamente para que el servicio funcione. Las
            comunicaciones van cifradas (HTTPS).
          </p>

          <h2>Cuánto tiempo</h2>
          <p>
            Las citas se conservan mientras el taller use CiTaller, porque forman su historial (qué
            vehículo vino, cuándo y para qué). Puedes pedir que borremos las tuyas en cualquier momento.
          </p>

          <h2>Tus derechos</h2>
          <p>
            Puedes pedirnos acceder a tus datos, corregirlos, borrarlos, limitar su uso u oponerte a él
            escribiendo a <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>. Te responderemos lo
            antes posible y siempre en el plazo de un mes. Si crees que no hemos atendido bien tu petición,
            puedes reclamar ante la Agencia Española de Protección de Datos (
            <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
              www.aepd.es
            </a>
            ).
          </p>

          <h2>Cambios en esta política</h2>
          <p>
            Si cambiamos algo, lo publicaremos en esta misma página con la fecha de la revisión. La versión
            vigente es siempre la que aparece aquí.
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
