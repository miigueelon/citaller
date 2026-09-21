import { CalendarDays, LogOut, Plus, RefreshCw, Wrench } from "lucide-react";

interface Props {
  nombreTaller: string;
  modoHistorial: boolean;
  totalReservas: number;
  totalHistorial: number;
  cargando: boolean;
  onActualizar: () => void;
  onNuevaCita: () => void;
  onConectarGoogle: () => void;
  onCerrarSesion: () => void;
}

/**
 * Cabecera del panel. El nombre del taller es el título; CiTaller queda como marca pequeña arriba.
 * Una sola acción naranja (Nueva cita): las demás son secundarias o de texto.
 */
export function CabeceraPanel({
  nombreTaller,
  modoHistorial,
  totalReservas,
  totalHistorial,
  cargando,
  onActualizar,
  onNuevaCita,
  onConectarGoogle,
  onCerrarSesion,
}: Props) {
  const subtitulo = modoHistorial
    ? `${totalHistorial} ${totalHistorial === 1 ? "reserva pasada" : "reservas pasadas"}`
    : `${totalReservas} ${totalReservas === 1 ? "reserva" : "reservas"}`;

  return (
    <>
      <div className="panel-logo">
        <div className="logo-container">
          <div className="logo-icon">
            <Wrench className="logo-wrench" />
          </div>
          <span className="logo-text">
            Ci<span className="logo-naranja">Taller</span>
          </span>
        </div>

        <button type="button" className="panel-btn panel-btn-texto" onClick={onCerrarSesion}>
          <LogOut className="panel-btn-icon" />
          Cerrar sesión
        </button>
      </div>

      <div className="panel-header">
        <div>
          <h1 className="panel-titulo">
            <span className="panel-eyebrow">{modoHistorial ? "Historial de reservas" : "Panel de reservas"}</span>
            {nombreTaller}
          </h1>
          <p className="panel-subtitulo">{subtitulo}</p>
        </div>

        <div className="panel-acciones">
          <button type="button" className="panel-btn panel-btn-secundario" onClick={onActualizar} disabled={cargando}>
            <RefreshCw className={`panel-btn-icon ${cargando ? "spin" : ""}`} />
            Actualizar
          </button>
          {/* Disponible para cualquier taller: la conexión se guarda por taller. */}
          <button type="button" className="panel-btn panel-btn-secundario" onClick={onConectarGoogle}>
            <CalendarDays className="panel-btn-icon" />
            Conectar Google Calendar
          </button>
          <button type="button" className="panel-btn panel-btn-primario" onClick={onNuevaCita}>
            <Plus className="panel-btn-icon" />
            Nueva cita
          </button>
        </div>
      </div>
    </>
  );
}
