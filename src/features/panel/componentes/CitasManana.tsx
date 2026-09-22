import { MessageCircle } from "lucide-react";
import { horaCorta } from "@/lib/fechas";
import { marcaAviso } from "../filtros";
import type { ReservaPanel } from "../tipos";

interface Props {
  reservas: ReservaPanel[];
  onRecordar: (reserva: ReservaPanel) => void;
}

/**
 * Modo enlace: las citas confirmadas de mañana con teléfono, con un botón por cita que abre
 * WhatsApp con el recordatorio ya escrito (en modo api las envía el cron solo). Al pulsarlo, la
 * marca "✓ Recordatorio enviado a las HH:MM" ocupa el sitio del botón; el título cuenta los que faltan.
 */
export function CitasManana({ reservas, onRecordar }: Props) {
  if (reservas.length === 0) return null;
  const porEnviar = reservas.filter((reserva) => !reserva.whatsapp_recordatorio_enviado).length;

  return (
    <section className="citas-manana" aria-labelledby="citas-manana-titulo">
      <h3 id="citas-manana-titulo" className="citas-manana-titulo">
        {porEnviar === 0 ? "Recordatorios para mañana: todos enviados ✓" : `Recordatorios para mañana (${porEnviar} por enviar)`}
      </h3>
      <p className="citas-manana-texto">Pulsa cada botón para abrir WhatsApp con el recordatorio escrito y envíalo desde tu móvil.</p>
      <ul className="citas-manana-lista">
        {reservas.map((reserva) => {
          const enviado = marcaAviso(reserva, "recordatorio");
          return (
            <li key={reserva.id} className="citas-manana-item">
              <span>
                <strong>{horaCorta(reserva.hora)}</strong> · {reserva.nombre || "Sin nombre"} · {reserva.servicio || "-"}
              </span>
              {enviado ? (
                <span className="citas-manana-hecho">{enviado}</span>
              ) : (
                <button type="button" className="btn-whatsapp" onClick={() => onRecordar(reserva)}>
                  <MessageCircle size={16} /> Recordatorio
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
