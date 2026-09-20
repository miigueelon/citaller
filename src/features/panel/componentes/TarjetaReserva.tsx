import { AlertTriangle, Car, Clock, Hash, Phone, Store, User, Wrench } from "lucide-react";
import { horaCorta } from "@/lib/fechas";
import type { CampoFormulario } from "@/features/taller/api";
import type { ReservaPanel } from "../tipos";

interface Props {
  reserva: ReservaPanel;
  /** Campos extra del taller, para mostrar sus etiquetas. */
  campos: CampoFormulario[];
  /** Mientras hay una acción en curso, los botones se deshabilitan. */
  ocupado?: boolean;
  onConfirmar: (reserva: ReservaPanel) => void;
  onCancelar: (reserva: ReservaPanel) => void;
  /** Modo enlace: abre WhatsApp con el mensaje ya escrito. */
  onAvisarWhatsapp?: (reserva: ReservaPanel) => void;
}

function etiquetaEstado(reserva: ReservaPanel): string {
  if (reserva.estado === "Cancelada" && reserva.cancelada_por === "cliente") return "Cancelada por el cliente";
  return reserva.estado;
}

export function TarjetaReserva({ reserva, campos, ocupado = false, onConfirmar, onCancelar, onAvisarWhatsapp }: Props) {
  const extras = campos
    .map((campo) => ({ campo, valor: reserva.datos_extra[campo.clave] }))
    .filter(({ valor }) => valor !== undefined && valor !== null && String(valor).trim() !== "");
  const errores = [reserva.whatsapp_error && `WhatsApp: ${reserva.whatsapp_error}`, reserva.google_error && `Google Calendar: ${reserva.google_error}`].filter(Boolean) as string[];

  return (
    <div className="tarjeta-reserva">
      <div className="tarjeta-header">
        <div className="tarjeta-hora">
          <Clock className="tarjeta-icon" size={18} />
          <span className="tarjeta-hora-texto">{reserva.hora ? horaCorta(reserva.hora) : "--:--"}</span>
          {reserva.creada_por === "taller" && (
            <span className="tarjeta-origen" title="Cita apuntada desde el panel">
              <Store size={14} /> Mostrador
            </span>
          )}
        </div>
        <span className={`estado-badge estado-${reserva.estado.toLowerCase()}`}>
          <span className="estado-punto"></span>
          {etiquetaEstado(reserva)}
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
          <Phone className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Teléfono</p>
            <p className="campo-valor">{reserva.telefono ? <a href={`tel:+${reserva.telefono}`}>{reserva.telefono}</a> : "Sin teléfono"}</p>
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

        <div className="campo-item">
          <Wrench className="campo-icon" size={16} />
          <div className="campo-contenido">
            <p className="campo-label">Servicio</p>
            <p className="campo-valor">{reserva.servicio || "-"}</p>
          </div>
        </div>

        {extras.map(({ campo, valor }) => (
          <div className="campo-item" key={campo.id}>
            <Wrench className="campo-icon" size={16} />
            <div className="campo-contenido">
              <p className="campo-label">{campo.etiqueta.replace(/\s*\(opcional\)/i, "")}</p>
              <p className="campo-valor">
                {campo.tipo === "numero" ? Number(valor).toLocaleString("es-ES") : String(valor)}
                {campo.unidad ? ` ${campo.unidad}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {reserva.descripcion && (
        <div className="descripcion-reserva">
          <p className="descripcion-reserva-titulo">{reserva.servicio === "Otro" ? "QUÉ NECESITA" : "DESCRIPCIÓN"}</p>
          <p className="descripcion-reserva-texto">{reserva.descripcion}</p>
        </div>
      )}

      {errores.length > 0 && (
        <div className="tarjeta-aviso" role="alert">
          <AlertTriangle size={16} />
          <div>
            {errores.map((texto) => (
              <p key={texto}>{texto}</p>
            ))}
          </div>
        </div>
      )}

      {reserva.estado === "Pendiente" && (
        <div className="tarjeta-acciones">
          <button type="button" className="btn-confirmar" onClick={() => onConfirmar(reserva)} disabled={ocupado}>
            ✓ Confirmar
          </button>
          <button type="button" className="btn-cancelar" onClick={() => onCancelar(reserva)} disabled={ocupado}>
            ✕ Cancelar
          </button>
        </div>
      )}

      {reserva.estado === "Confirmada" && (
        <div className="tarjeta-acciones">
          {onAvisarWhatsapp && reserva.telefono && (
            <button type="button" className="btn-whatsapp" onClick={() => onAvisarWhatsapp(reserva)} disabled={ocupado}>
              Avisar por WhatsApp
            </button>
          )}
          <button type="button" className="btn-cancelar" onClick={() => onCancelar(reserva)} disabled={ocupado}>
            ✕ Cancelar cita
          </button>
        </div>
      )}

      {reserva.estado === "Cancelada" && reserva.cancelada_por === "taller" && onAvisarWhatsapp && reserva.telefono && (
        <div className="tarjeta-acciones">
          <button type="button" className="btn-whatsapp" onClick={() => onAvisarWhatsapp(reserva)} disabled={ocupado}>
            Avisar de la cancelación
          </button>
        </div>
      )}
    </div>
  );
}
