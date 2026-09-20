import { useState } from "react";
import { useTaller } from "@/app/providers/useTaller";
import { formatearDiaLargo } from "@/lib/fechas";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  /** Enlace propio de la cita (`/<slug>/cita/<token>`), con el que el cliente puede cancelarla. */
  enlaceCita: string;
  otraReserva: () => void;
}

const TEXTO_POR_MODO = {
  api: "Cuando el taller confirme tu cita recibirás un WhatsApp con los datos.",
  enlace: "El taller te avisará por WhatsApp o por teléfono cuando confirme tu cita.",
  ninguno: "El taller revisará tu solicitud y se pondrá en contacto contigo para confirmarla.",
};

/** Pantalla final: la solicitud ya está guardada. */
export function ReservaConfirmada({ reserva, enlaceCita, otraReserva }: Props) {
  const taller = useTaller();
  const [copiado, setCopiado] = useState(false);

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(enlaceCita);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copia este enlace:", enlaceCita);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="icono-exito">✓</div>

        <h1>¡Solicitud enviada!</h1>

        <p className="subtitulo">
          {taller.nombre} ha recibido tu solicitud para el {reserva.dia ? formatearDiaLargo(reserva.dia) : "día elegido"} a las {reserva.hora}.
        </p>

        <p className="nota-final">{taller.texto_confirmacion ?? TEXTO_POR_MODO[taller.whatsapp_modo]}</p>

        <div className="enlace-cita">
          <p className="enlace-cita-titulo">Tu enlace de la cita</p>
          <p className="enlace-cita-texto">Guárdalo: desde él podrás ver tu cita y cancelarla hasta 24 horas antes si no puedes venir.</p>
          <a className="enlace-cita-url" href={enlaceCita}>
            {enlaceCita}
          </a>
          <button type="button" className="enlace-cita-copiar" onClick={() => void copiarEnlace()}>
            {copiado ? "Copiado ✓" : "Copiar enlace"}
          </button>
        </div>

        {taller.telefono && (
          <p className="nota-final">
            Para cualquier otra cosa, llama al taller: <strong>{taller.telefono}</strong>.
          </p>
        )}

        <button type="button" className="boton-principal" onClick={otraReserva}>
          HACER OTRA RESERVA
        </button>
      </div>
    </div>
  );
}
