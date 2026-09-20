import { useState } from "react";
import { Alerta } from "@/components/Alerta";
import { useTaller } from "@/app/providers/useTaller";
import { camposDelServicio } from "@/features/taller/api";
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
  const taller = useTaller();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servicio = taller.servicios.find((s) => s.nombre === reserva.servicio);
  const camposConValor = camposDelServicio(taller.campos, servicio).filter((campo) => (reserva.datos_extra[campo.clave] ?? "").trim() !== "");

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

          {camposConValor.map((campo) => (
            <div className="resumen-item" key={campo.id}>
              <span>{campo.etiqueta.replace(/\s*\(opcional\)/i, "")}</span>
              <strong>
                {campo.tipo === "numero" ? Number(reserva.datos_extra[campo.clave]).toLocaleString("es-ES") : reserva.datos_extra[campo.clave]}
                {campo.unidad ? ` ${campo.unidad}` : ""}
              </strong>
            </div>
          ))}

          {reserva.descripcion && (
            <div className="resumen-item">
              <span>📝 {servicio?.descripcion_etiqueta ?? "Descripción"}</span>
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
