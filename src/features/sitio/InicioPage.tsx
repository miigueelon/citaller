import { Link } from "react-router";
import { CalendarCheck, Check, ClipboardCheck, Mail, QrCode } from "lucide-react";
import { CORREO_CONTACTO } from "./contacto";
import estilos from "./sitio.module.css";

const VENTAJAS = [
  "Servicios, horarios y capacidad a tu medida: por horas o por citas al día.",
  "Pide lo que necesites saber antes de que llegue el vehículo: kilómetros, medida del neumático, lo que sea.",
  "Confirmación y recordatorio del día antes por WhatsApp, con el enlace de la cita.",
  "Apunta también las citas de mostrador y del teléfono: todo en la misma agenda.",
  "Sin instalar nada: funciona en el móvil y en el ordenador del taller.",
  "Un enlace propio para tu ficha de Google y un QR para el mostrador.",
];

/**
 * Página principal (`/`): explica qué es CiTaller a un taller que llega por curiosidad y sirve de
 * página de inicio para Google (publicación de la app de Calendar). Los clientes nunca pasan por
 * aquí: llegan directos al enlace de su taller.
 */
export function InicioPage() {
  return (
    <main className={estilos.pagina}>
      <div className={estilos.tarjeta}>
        <p className={estilos.eyebrow}>
          <span className={estilos.marca}>
            Ci<span>Taller</span>
          </span>
        </p>
        <h1 className={estilos.titulo}>Reservas de cita online para tu taller</h1>
        <p className={estilos.lema}>
          Tus clientes piden cita desde el móvil, sin llamar. Tú la confirmas con un toque y aparece en tu
          Google Calendar.
        </p>

        <h2 className={estilos.seccionTitulo}>Cómo funciona</h2>
        <ol className={estilos.pasos}>
          <li className={estilos.paso}>
            <span className={estilos.pasoIcono} aria-hidden="true">
              <QrCode size={22} />
            </span>
            <h3>1. El cliente pide cita</h3>
            <p>
              Escanea el QR del mostrador o pulsa «Reservar» en tu ficha de Google. Elige servicio, día y hora
              en menos de un minuto.
            </p>
          </li>
          <li className={estilos.paso}>
            <span className={estilos.pasoIcono} aria-hidden="true">
              <ClipboardCheck size={22} />
            </span>
            <h3>2. Tú la confirmas</h3>
            <p>
              La solicitud aparece en tu panel con los datos del vehículo. La confirmas o la rechazas con un
              toque, desde el móvil o el ordenador.
            </p>
          </li>
          <li className={estilos.paso}>
            <span className={estilos.pasoIcono} aria-hidden="true">
              <CalendarCheck size={22} />
            </span>
            <h3>3. Todo queda apuntado</h3>
            <p>
              La cita entra en tu Google Calendar y el cliente recibe la confirmación por WhatsApp, con un
              enlace para cancelar si no puede venir.
            </p>
          </li>
        </ol>

        <h2 className={estilos.seccionTitulo}>Pensado para el taller</h2>
        <ul className={estilos.ventajas}>
          {VENTAJAS.map((texto) => (
            <li key={texto}>
              <Check size={18} aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        <div className={estilos.cta}>
          <p>
            <strong>¿Quieres CiTaller en tu taller?</strong>
            Escríbenos y lo dejamos funcionando contigo: servicios, horarios, QR y ficha de Google.
          </p>
          <a className={estilos.botonCorreo} href={`mailto:${CORREO_CONTACTO}`}>
            <Mail size={18} aria-hidden="true" />
            Escríbenos
          </a>
        </div>

        <footer className={estilos.pie}>
          <span>© {new Date().getFullYear()} CiTaller</span>
          <span>
            <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> · <Link to="/privacidad">Política de privacidad</Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
