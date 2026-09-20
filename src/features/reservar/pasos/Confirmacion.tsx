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
        <div
          style={{
            width: "74px",
            height: "74px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "42px",
            fontWeight: "700",
            boxShadow: "0 12px 28px rgba(34,197,94,.25)",
          }}
        >
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

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            color: "#6b7280",
            lineHeight: "1.6",
            fontSize: "15px",
          }}
        >
          En unos minutos el taller recibirá tu solicitud y recibirás un WhatsApp con la confirmación.
        </p>

        <button
          type="button"
          style={{ marginTop: "26px" }}
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
