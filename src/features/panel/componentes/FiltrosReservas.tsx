import { Search } from "lucide-react";
import type { FiltroEstado, FiltroFecha } from "../tipos";

interface Props {
  filtroEstado: FiltroEstado;
  onFiltroEstado: (filtro: FiltroEstado) => void;
  contadores: Record<FiltroEstado, number>;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  filtroFecha: FiltroFecha;
  onFiltroFecha: (filtro: FiltroFecha) => void;
}

const PESTANAS: Array<[FiltroEstado, string]> = [
  ["Pendiente", "Pendientes"],
  ["Confirmada", "Confirmadas"],
  ["Finalizada", "Finalizadas"],
  ["Cancelada", "Canceladas"],
];

const FECHAS: Array<[FiltroFecha, string]> = [
  ["todas", "Todas"],
  ["hoy", "Hoy"],
  ["manana", "Mañana"],
  ["7dias", "Próximos 7 días"],
];

export function FiltrosReservas({ filtroEstado, onFiltroEstado, contadores, busqueda, onBusqueda, filtroFecha, onFiltroFecha }: Props) {
  return (
    <>
      <div className="filtros-reservas">
        {PESTANAS.map(([valor, etiqueta]) => (
          <button key={valor} type="button" className={filtroEstado === valor ? "filtro-activo" : ""} onClick={() => onFiltroEstado(valor)}>
            {etiqueta} ({contadores[valor]})
          </button>
        ))}
      </div>

      <div className="buscador-reservas">
        <Search className="buscador-reservas-icono" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={(evento) => onBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, teléfono, matrícula o vehículo..."
          aria-label="Buscar reservas"
        />
        {busqueda && (
          <button type="button" className="buscador-reservas-limpiar" onClick={() => onBusqueda("")}>
            Limpiar
          </button>
        )}
      </div>

      {/* Las finalizadas son el histórico (días pasados): "hoy", "mañana" y "próximos 7 días" no aplican. */}
      {filtroEstado !== "Finalizada" && (
        <div className="filtro-fecha-rapido">
          {FECHAS.map(([valor, etiqueta]) => (
            <button key={valor} type="button" className={filtroFecha === valor ? "activo" : ""} onClick={() => onFiltroFecha(valor)}>
              {etiqueta}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
