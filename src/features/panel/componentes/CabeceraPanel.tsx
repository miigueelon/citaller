import { RefreshCw, Wrench } from "lucide-react";

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
      </div>

      <div className="panel-header">
        <div>
          <h1 className="panel-titulo">{modoHistorial ? `Historial · ${nombreTaller}` : `Panel · ${nombreTaller}`}</h1>
          <p className="panel-subtitulo">{subtitulo}</p>
        </div>

        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <button type="button" className="panel-btn-actualizar" onClick={onActualizar} disabled={cargando} style={{ flex: 1 }}>
            <RefreshCw className={`panel-btn-icon ${cargando ? "spin" : ""}`} />
            Actualizar
          </button>
          <button type="button" className="panel-btn-actualizar" onClick={onNuevaCita} style={{ flex: 1 }}>
            + Nueva cita
          </button>
          {/* Disponible para cualquier taller: la conexión se guarda por taller. */}
          <button type="button" className="panel-btn-actualizar" onClick={onConectarGoogle} style={{ flex: 1 }}>
            Conectar Google Calendar
          </button>
          <button type="button" className="panel-btn-actualizar" onClick={onCerrarSesion} style={{ flex: 1 }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
