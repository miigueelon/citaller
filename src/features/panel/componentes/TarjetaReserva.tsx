import { Car, Clock, Gauge, Hash, User, Wrench } from "lucide-react";
import { horaCorta } from "@/lib/fechas";
import { tallerPideKilometros } from "@/features/taller/configTemporal";
import type { ReservaPanel } from "../tipos";

interface Props {
  reserva: ReservaPanel;
  onConfirmar: (reserva: ReservaPanel) => void;
  onCancelar: (reserva: ReservaPanel) => void;
}

export function TarjetaReserva({ reserva, onConfirmar, onCancelar }: Props) {
  const mostrarKilometros = tallerPideKilometros(reserva.taller_id) && reserva.kilometros !== null;

  return (
    <div className="tarjeta-reserva">
      <div className="tarjeta-header">
        <div className="tarjeta-hora">
          <Clock className="tarjeta-icon" size={18} />
          <span className="tarjeta-hora-texto">{reserva.hora ? horaCorta(reserva.hora) : "--:--"}</span>
        </div>
        <span className={`estado-badge estado-${reserva.estado.toLowerCase()}`}>
          <span className="estado-punto"></span>
          {reserva.estado}
        </span>
      </div>

      <div className="tarjeta-grid">
        <div className="campo-item">
          <User className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Cliente</p>
            <p className="campo-valor">{reserva.nombre || "-"}</p>
          </div>
        </div>

        <div className="campo-item">
          <Hash className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Matrícula</p>
            <p className="campo-valor">{reserva.matricula || "-"}</p>
          </div>
        </div>

        <div className="campo-item">
          <Car className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Vehículo</p>
            <p className="campo-valor">{reserva.vehiculo || "-"}</p>
          </div>
        </div>

        {mostrarKilometros && (
          <div className="campo-item">
            <Gauge className="campo-icon" size={16} />
            <div className="campo-contenido">
              <p className="campo-label">Kilómetros</p>
              <p className="campo-valor">{Number(reserva.kilometros).toLocaleString("es-ES")} km</p>
            </div>
          </div>
        )}

        <div className="campo-item">
          <Wrench className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Servicio</p>
            <p className="campo-valor">{reserva.servicio || "-"}</p>
          </div>
        </div>
      </div>

      {reserva.descripcion && (
        <div className="descripcion-reserva">
          <p className="descripcion-reserva-titulo">{reserva.servicio === "Otro" ? "QUÉ NECESITA" : "DESCRIPCIÓN"}</p>
          <p className="descripcion-reserva-texto">{reserva.descripcion}</p>
        </div>
      )}

      {reserva.estado === "Pendiente" && (
        <div className="tarjeta-acciones">
          <button type="button" className="btn-confirmar" onClick={() => onConfirmar(reserva)}>
            ✓ Confirmar
          </button>
          <button type="button" className="btn-cancelar" onClick={() => onCancelar(reserva)}>
            ✕ Cancelar
          </button>
        </div>
      )}

      {reserva.estado === "Confirmada" && (
        <div className="tarjeta-acciones">
          <button type="button" className="btn-cancelar" onClick={() => onCancelar(reserva)}>
            ✕ Cancelar cita
          </button>
        </div>
      )}
    </div>
  );
}
