import { formatearDiaCorto } from "@/lib/fechas";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  guardarReserva: () => Promise<boolean>;
  volverMenu: () => void;
}

/** Paso 3: resumen de la solicitud y envío. (En la fase 2.5 pasa a mostrar "enviada" solo tras guardar.) */
export function Confirmacion({ reserva, guardarReserva, volverMenu }: Props) {
  const fechaFormateada = reserva.dia ? formatearDiaCorto(reserva.dia) : "-";

  return (
    <div className="container">
      <div className="card">
        <div className="icono-exito">
          ✓
        </div>

        <h1>¡Solicitud enviada!</h1>

        <p className="subtitulo">Tu solicitud de cita se ha enviado correctamente.</p>

        <div className="resumen-reserva">
          <div className="resumen-item">
            <span>🚗 Matrícula</span>
            <strong>{reserva.matricula}</strong>
          </div>

          <div className="resumen-item">
            <span>🚙 Vehículo</span>
            <strong>{reserva.vehiculo}</strong>
          </div>

          <div className="resumen-item">
            <span>👤 Cliente</span>
            <strong>{reserva.nombre}</strong>
          </div>

          <div className="resumen-item">
            <span>📱 Teléfono</span>
            <strong>{reserva.telefono}</strong>
          </div>

          <div className="resumen-item">
            <span>🔧 Servicio</span>
            <strong>{reserva.servicio}</strong>
          </div>

          {reserva.descripcion && (
            <div className="resumen-item">
              <span>📝 {reserva.servicio === "Otro" ? "Necesidad" : "Descripción"}</span>
              <strong>{reserva.descripcion}</strong>
            </div>
          )}

          <div className="resumen-item">
            <span>📅 Fecha</span>
            <strong>{fechaFormateada}</strong>
          </div>

          <div className="resumen-item">
            <span>🕒 Hora</span>
            <strong>{reserva.hora}</strong>
          </div>
        </div>

        <p className="nota-final">
          En unos minutos el taller recibirá tu solicitud y recibirás un WhatsApp con la confirmación.
        </p>

        <button
          type="button"
          className="boton-principal"
          onClick={async () => {
            const guardada = await guardarReserva();
            if (guardada) volverMenu();
          }}
        >
          FINALIZAR
        </button>
      </div>
    </div>
  );
}
