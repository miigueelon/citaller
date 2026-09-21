import { AlertTriangle, Car, CheckCircle2, Clock, Hash, Phone, Store, User, Wrench } from "lucide-react";
import { horaCorta, hoy } from "@/lib/fechas";
import type { CampoFormulario } from "@/features/taller/api";
import { formatearTelefono } from "@/features/reservar/validacion";
import { marcaAviso, textoLista } from "../filtros";
import type { ReservaPanel } from "../tipos";

interface Props {
  reserva: ReservaPanel;
  /** Campos extra del taller, para mostrar sus etiquetas. */
  campos: CampoFormulario[];
  /** Mientras hay una acción en curso, los botones se deshabilitan. */
  ocupado?: boolean;
  onConfirmar: (reserva: ReservaPanel) => void;
  onCancelar: (reserva: ReservaPanel) => void;
  /** Modo enlace: abre WhatsApp con el mensaje ya escrito y lo apunta como avisado. */
  onAvisarWhatsapp?: (reserva: ReservaPanel) => void;
  /** Marca la cita como terminada y, en modo enlace, abre WhatsApp con "ya está listo". Se puede repetir. */
  onVehiculoListo?: (reserva: ReservaPanel) => void;
  /** Quita la marca de terminada (por si se pulsó en la cita que no era). */
  onDeshacerListo?: (reserva: ReservaPanel) => void;
}

function etiquetaEstado(reserva: ReservaPanel): string {
  if (reserva.estado === "Cancelada" && reserva.cancelada_por === "cliente") return "Cancelada por el cliente";
  return reserva.estado;
}

export function TarjetaReserva({ reserva, campos, ocupado = false, onConfirmar, onCancelar, onAvisarWhatsapp, onVehiculoListo, onDeshacerListo }: Props) {
  // Solo hay WhatsApp en modo enlace (onAvisarWhatsapp) y si la cita tiene teléfono.
  const avisaPorWhatsapp = !!onAvisarWhatsapp && !!reserva.telefono;
  // Se termina el día de la cita o después (la base de datos tampoco deja marcar una de mañana).
  const puedeTerminar = reserva.dia <= hoy();
  // Avisos ya mandados: "✓ Confirmación avisada a las 12:30" (null si no).
  const confirmacionAvisada = marcaAviso(reserva, "confirmacion");
  const cancelacionAvisada = marcaAviso(reserva, "cancelacion");
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
            <span className="tarjeta-origen" title={reserva.apuntada_por ? `Cita apuntada desde el panel por ${reserva.apuntada_por}` : "Cita apuntada desde el panel"}>
              <Store size={14} /> Mostrador{reserva.apuntada_por ? ` · ${reserva.apuntada_por}` : ""}
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
            <p className="campo-valor">{reserva.telefono ? <a href={`tel:+${reserva.telefono}`}>{formatearTelefono(reserva.telefono)}</a> : "Sin teléfono"}</p>
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
        <>
          {reserva.listo_en && (
            <div className="tarjeta-marca">
              <span>{textoLista(reserva.listo_en, avisaPorWhatsapp)}</span>
              {onDeshacerListo && (
                <button type="button" className="tarjeta-marca-deshacer" onClick={() => onDeshacerListo(reserva)} disabled={ocupado}>
                  Deshacer
                </button>
              )}
            </div>
          )}
          {/* Lista y sin WhatsApp, volver a pulsar no haría nada nuevo: el botón desaparece. */}
          {puedeTerminar && onVehiculoListo && (!reserva.listo_en || avisaPorWhatsapp) && (
            <div className="tarjeta-acciones">
              <button type="button" className={reserva.listo_en ? "btn-whatsapp" : "btn-whatsapp btn-listo"} onClick={() => onVehiculoListo(reserva)} disabled={ocupado}>
                <CheckCircle2 size={16} /> {reserva.listo_en ? "Volver a avisar por WhatsApp" : avisaPorWhatsapp ? "Vehículo listo: avisar por WhatsApp" : "Vehículo listo"}
              </button>
            </div>
          )}
          {/* Terminada, ya no toca recordar la cita ni cancelarla (si fue un error, "Deshacer"). */}
          {!reserva.listo_en && (
            <>
              {confirmacionAvisada && <div className="tarjeta-marca">{confirmacionAvisada}</div>}
              <div className="tarjeta-acciones">
                {avisaPorWhatsapp && onAvisarWhatsapp && (
                  <button type="button" className="btn-whatsapp" onClick={() => onAvisarWhatsapp(reserva)} disabled={ocupado}>
                    {confirmacionAvisada ? "Volver a avisar" : "Avisar por WhatsApp"}
                  </button>
                )}
                <button type="button" className="btn-cancelar" onClick={() => onCancelar(reserva)} disabled={ocupado}>
                  ✕ Cancelar cita
                </button>
              </div>
            </>
          )}
        </>
      )}

      {reserva.estado === "Cancelada" && reserva.cancelada_por === "taller" && (
        <>
          {cancelacionAvisada && <div className="tarjeta-marca">{cancelacionAvisada}</div>}
          {avisaPorWhatsapp && onAvisarWhatsapp && (
            <div className="tarjeta-acciones">
              <button type="button" className="btn-whatsapp" onClick={() => onAvisarWhatsapp(reserva)} disabled={ocupado}>
                {cancelacionAvisada ? "Volver a avisar de la cancelación" : "Avisar de la cancelación"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
