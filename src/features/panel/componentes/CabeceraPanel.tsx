import { CalendarCheck, CalendarDays, LogOut, Plus, RefreshCw, Wrench } from "lucide-react";
import { textoResumen, type ResumenCabecera } from "../filtros";

interface Props {
  nombreTaller: string;
  resumen: ResumenCabecera;
  cargando: boolean;
  /** null mientras se consulta. */
  googleConectado: boolean | null;
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
  resumen,
  cargando,
  googleConectado,
  onActualizar,
  onNuevaCita,
  onConectarGoogle,
  onCerrarSesion,
}: Props) {
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
            <span className="panel-eyebrow">Panel de reservas</span>
            {nombreTaller}
          </h1>
          <p className="panel-subtitulo">{textoResumen(resumen)}</p>
        </div>

        <div className="panel-acciones">
          <button type="button" className="panel-btn panel-btn-secundario" onClick={onActualizar} disabled={cargando}>
            <RefreshCw className={`panel-btn-icon ${cargando ? "spin" : ""}`} />
            Actualizar
          </button>
          {googleConectado ? (
            <button type="button" className="panel-btn panel-btn-secundario panel-btn-conectado" onClick={onConectarGoogle} title="Volver a conectar o cambiar de cuenta">
              <CalendarCheck className="panel-btn-icon" />
              Google Calendar conectado
            </button>
          ) : (
            <button type="button" className="panel-btn panel-btn-secundario" onClick={onConectarGoogle} disabled={googleConectado === null}>
              <CalendarDays className="panel-btn-icon" />
              {googleConectado === null ? "Google Calendar" : "Conectar Google Calendar"}
            </button>
          )}
          <button type="button" className="panel-btn panel-btn-primario" onClick={onNuevaCita}>
            <Plus className="panel-btn-icon" />
            Nueva cita
          </button>
        </div>
      </div>
    </>
  );
}
