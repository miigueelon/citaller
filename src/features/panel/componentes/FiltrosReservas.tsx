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
        <button type="button" className={filtroEstado === "Pendiente" ? "filtro-activo" : ""} onClick={() => onFiltroEstado("Pendiente")}>
          Pendientes ({contadores.Pendiente})
        </button>
        <button type="button" className={filtroEstado === "Confirmada" ? "filtro-activo" : ""} onClick={() => onFiltroEstado("Confirmada")}>
          Confirmadas ({contadores.Confirmada})
        </button>
        <button type="button" className={filtroEstado === "Cancelada" ? "filtro-activo" : ""} onClick={() => onFiltroEstado("Cancelada")}>
          Canceladas ({contadores.Cancelada})
        </button>
      </div>

      <div className="buscador-reservas">
        <Search className="buscador-reservas-icono" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={(evento) => onBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, matrícula o vehículo..."
          aria-label="Buscar reservas"
        />
        {busqueda && (
          <button type="button" className="buscador-reservas-limpiar" onClick={() => onBusqueda("")}>
            Limpiar
          </button>
        )}
      </div>

      <div className="filtro-fecha-rapido">
        {FECHAS.map(([valor, etiqueta]) => (
          <button key={valor} type="button" className={filtroFecha === valor ? "activo" : ""} onClick={() => onFiltroFecha(valor)}>
            {etiqueta}
          </button>
        ))}
      </div>
    </>
  );
}
