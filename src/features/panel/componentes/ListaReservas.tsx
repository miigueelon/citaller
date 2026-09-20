import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { CampoFormulario } from "@/features/taller/api";
import type { ReservaPanel } from "../tipos";
import { TarjetaReserva } from "./TarjetaReserva";

interface Props {
  cargando: boolean;
  error: string;
  /** Grupos [título, reservas] ya filtrados y ordenados. */
  grupos: Array<[string, ReservaPanel[]]>;
  textoVacio: string;
  campos: CampoFormulario[];
  ocupado?: boolean;
  onConfirmar: (reserva: ReservaPanel) => void;
  onCancelar: (reserva: ReservaPanel) => void;
  onAvisarWhatsapp?: (reserva: ReservaPanel) => void;
}

export function ListaReservas({ cargando, error, grupos, textoVacio, campos, ocupado = false, onConfirmar, onCancelar, onAvisarWhatsapp }: Props) {
  if (cargando) {
    return (
      <div className="panel-estado panel-cargando">
        <Loader2 className="panel-estado-icon spin" />
        <p>Cargando reservas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-error">
        <AlertCircle className="panel-error-icon" />
        <div>
          <p className="panel-error-titulo">Error al cargar reservas</p>
          <p className="panel-error-texto">{error}</p>
        </div>
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="panel-estado panel-vacio">
        <Inbox className="panel-estado-icon" />
        <p>{textoVacio}</p>
      </div>
    );
  }

  return (
    <div className="panel-grupos">
      {grupos.map(([titulo, items]) => (
        <div className="panel-grupo" key={`${titulo}-${items[0]?.id ?? ""}`}>
          <h3 className="panel-grupo-titulo">{titulo}</h3>
          <div className="panel-grupo-items">
            {items.map((reserva) => (
              <TarjetaReserva
                key={reserva.id}
                reserva={reserva}
                campos={campos}
                ocupado={ocupado}
                onConfirmar={onConfirmar}
                onCancelar={onCancelar}
                onAvisarWhatsapp={onAvisarWhatsapp}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
