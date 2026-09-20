import { useTaller } from "@/app/providers/useTaller";
import { formatearDiaLargo } from "@/lib/fechas";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  otraReserva: () => void;
}

/**
 * Pantalla final: la solicitud ya está guardada. El texto no promete WhatsApp: cada taller avisa
 * como tenga configurado (fase 3: según `whatsapp_modo`), y aquí irá el enlace de la cita.
 */
export function ReservaConfirmada({ reserva, otraReserva }: Props) {
  const taller = useTaller();

  return (
    <div className="container">
      <div className="card">
        <div className="icono-exito">✓</div>

        <h1>¡Solicitud enviada!</h1>

        <p className="subtitulo">
          {taller.nombre} ha recibido tu solicitud para el {reserva.dia ? formatearDiaLargo(reserva.dia) : "día elegido"} a las {reserva.hora}.
        </p>

        <p className="nota-final">
          El taller revisará tu solicitud y te confirmará la cita.
          {taller.telefono && (
            <>
              {" "}
              Si necesitas cambiarla, llama al <strong>{taller.telefono}</strong>.
            </>
          )}
        </p>

        <button type="button" className="boton-principal" onClick={otraReserva}>
          HACER OTRA RESERVA
        </button>
      </div>
    </div>
  );
}
