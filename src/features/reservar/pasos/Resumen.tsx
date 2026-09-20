import { useState } from "react";
import { Alerta } from "@/components/Alerta";
import { formatearDiaLargo } from "@/lib/fechas";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  /** Guarda la solicitud. Devuelve null si se creó, o el mensaje de error. */
  enviar: () => Promise<string | null>;
  volver: () => void;
}

/** Paso 3: revisar la solicitud antes de enviarla. El botón se bloquea mientras se guarda. */
export function Resumen({ reserva, enviar, volver }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const mensaje = await enviar();
    if (mensaje) {
      setError(mensaje);
      setEnviando(false);
    }
    // Si se guardó, la página cambia a la pantalla de éxito y este componente desaparece.
  }

  return (
    <div className="container">
      <div className="card">
        <div className="volver-card">
          <button type="button" className="volver-menu" onClick={volver} disabled={enviando}>
            ← Volver
          </button>
        </div>

        <h1>Revisa tu solicitud</h1>

        <p className="subtitulo">Comprueba que todo es correcto antes de enviarla.</p>

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

          {reserva.cantidad_neumaticos && (
            <div className="resumen-item">
              <span>🛞 Neumáticos</span>
              <strong>{reserva.cantidad_neumaticos}</strong>
            </div>
          )}

          {reserva.kilometros && (
            <div className="resumen-item">
              <span>🧭 Kilómetros</span>
              <strong>{Number(reserva.kilometros).toLocaleString("es-ES")} km</strong>
            </div>
          )}

          {reserva.descripcion && (
            <div className="resumen-item">
              <span>📝 {reserva.servicio === "Otro" ? "Necesidad" : "Descripción"}</span>
              <strong>{reserva.descripcion}</strong>
            </div>
          )}

          <div className="resumen-item">
            <span>📅 Fecha</span>
            <strong>{reserva.dia ? formatearDiaLargo(reserva.dia, { conAnio: true }) : "-"}</strong>
          </div>

          <div className="resumen-item">
            <span>🕒 Hora</span>
            <strong>{reserva.hora}</strong>
          </div>
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <button type="button" className="boton-principal" onClick={() => void confirmar()} disabled={enviando}>
          {enviando ? "ENVIANDO..." : "ENVIAR SOLICITUD"}
        </button>
      </div>
    </div>
  );
}
