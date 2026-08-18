export default function Confirmacion({
  reserva,
  guardarReserva,
  volverMenu,
}) {

  const fechaFormateada = reserva.dia
    ? new Date(reserva.dia).toLocaleDateString("es-ES")
    : "-";

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
            boxShadow: "0 12px 28px rgba(34,197,94,.25)"
          }}
        >
          ✓
        </div>

        <h1>
          ¡Solicitud enviada!
        </h1>

        <p className="subtitulo">
          Tu solicitud de cita se ha enviado correctamente.
        </p>

        <div className="resumen-reserva">

          {/* MATRÍCULA */}

          <div className="resumen-item">

            <span>🚗 Matrícula</span>

            <strong>{reserva.matricula}</strong>

          </div>

          {/* VEHÍCULO */}

          <div className="resumen-item">

            <span>🚙 Vehículo</span>

            <strong>{reserva.vehiculo}</strong>

          </div>

          {/* CLIENTE */}

          <div className="resumen-item">

            <span>👤 Cliente</span>

            <strong>{reserva.nombre}</strong>

          </div>

          {/* TELÉFONO */}

          <div className="resumen-item">

            <span>📱 Teléfono</span>

            <strong>{reserva.telefono}</strong>

          </div>

          {/* SERVICIO */}

          <div className="resumen-item">

            <span>🔧 Servicio</span>

            <strong>{reserva.servicio}</strong>

          </div>

          {/* DESCRIPCIÓN - SOLO SI EXISTE */}

          {reserva.descripcion && (

            <div className="resumen-item">

              <span>
                📝 {reserva.servicio === "Otro"
                  ? "Necesidad"
                  : "Descripción"}
              </span>

              <strong>
                {reserva.descripcion}
              </strong>

            </div>

          )}

          {/* FECHA */}

          <div className="resumen-item">

            <span>📅 Fecha</span>

            <strong>{fechaFormateada}</strong>

          </div>

          {/* HORA */}

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
            fontSize: "15px"
          }}
        >
          En unos minutos el taller recibirá tu solicitud y recibirás un WhatsApp con la confirmación.
        </p>

        <button
          type="button"
          style={{ marginTop: "26px" }}
          onClick={async () => {
            const guardada = await guardarReserva();

            if (guardada) {
              volverMenu();
            }
          }}
        >
          FINALIZAR
        </button>

      </div>

    </div>

  );
}