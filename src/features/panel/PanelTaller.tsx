import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, History } from "lucide-react";
import { useAuth } from "@/app/providers/useAuth";
import { useTaller } from "@/app/providers/useTaller";
import { Alerta } from "@/components/Alerta";
import { Modal } from "@/components/Modal";
import { CabeceraPanel } from "./componentes/CabeceraPanel";
import { FiltrosReservas } from "./componentes/FiltrosReservas";
import { ListaReservas } from "./componentes/ListaReservas";
import { agruparPorDia, filtrarReservas, historial, porEstado, reservasFuturas, tituloGrupo, tituloHistorial, totalValidas } from "./filtros";
import type { FiltroEstado, FiltroFecha, ReservaPanel } from "./tipos";
import { useConexionGoogle } from "./useConexionGoogle";
import { useReservasTaller } from "./useReservasTaller";
import "./panel.css";

/** Panel del taller: reservas próximas por estado, búsqueda, historial, y acciones. */
export function PanelTaller() {
  const taller = useTaller();
  const { cliente, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const { reservas, cargando, error, recargar, cambiarEstado } = useReservasTaller(cliente, taller.id);
  const google = useConexionGoogle(cliente, taller.id, taller.slug);

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todas");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [pendienteDeCancelar, setPendienteDeCancelar] = useState<ReservaPanel | null>(null);
  const [operando, setOperando] = useState(false);

  const futuras = useMemo(() => reservasFuturas(reservas), [reservas]);
  const contadores = useMemo(
    () => ({
      Pendiente: porEstado(futuras, "Pendiente").length,
      Confirmada: porEstado(futuras, "Confirmada").length,
      Cancelada: porEstado(futuras, "Cancelada").length,
    }),
    [futuras],
  );

  const gruposProximas = useMemo(
    () => agruparPorDia(filtrarReservas(porEstado(futuras, filtroEstado), { busqueda, filtroFecha })).map(([dia, items]) => [tituloGrupo(dia), items] as [string, ReservaPanel[]]),
    [futuras, filtroEstado, busqueda, filtroFecha],
  );

  const pasadas = useMemo(() => historial(reservas), [reservas]);
  const gruposHistorial = useMemo(() => pasadas.map((reserva) => [tituloHistorial(reserva.dia), [reserva]] as [string, ReservaPanel[]]), [pasadas]);

  async function ejecutarCambio(reserva: ReservaPanel, estado: "Confirmada" | "Cancelada") {
    setOperando(true);
    const resultado = await cambiarEstado(reserva.id, estado);
    setOperando(false);
    setPendienteDeCancelar(null);
    if (resultado.avisos.length > 0) setAvisos(resultado.avisos);
  }

  function pedirCancelacion(reserva: ReservaPanel) {
    // Cancelar una pendiente no pide confirmación (comportamiento heredado); una confirmada, sí.
    if (reserva.estado === "Confirmada") setPendienteDeCancelar(reserva);
    else void ejecutarCambio(reserva, "Cancelada");
  }

  return (
    <div className="panel-taller-container">
      <div className="panel-taller-contenido">
        <CabeceraPanel
          nombreTaller={taller.nombre}
          modoHistorial={mostrarHistorial}
          totalReservas={totalValidas(reservas)}
          totalHistorial={pasadas.length}
          cargando={cargando}
          onActualizar={() => void recargar()}
          onNuevaCita={() => navigate(`/${taller.slug}`)}
          onConectarGoogle={() => void google.conectar()}
          onCerrarSesion={() => void cerrarSesion()}
        />

        {google.mensaje && (
          <Alerta tipo={google.mensaje.tipo} onCerrar={google.cerrarMensaje}>
            {google.mensaje.texto}
          </Alerta>
        )}

        {avisos.length > 0 && (
          <Alerta tipo="aviso" onCerrar={() => setAvisos([])}>
            {avisos.map((aviso) => (
              <p key={aviso}>
                {aviso}
              </p>
            ))}
          </Alerta>
        )}

        <FiltrosReservas
          filtroEstado={filtroEstado}
          onFiltroEstado={setFiltroEstado}
          contadores={contadores}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          filtroFecha={filtroFecha}
          onFiltroFecha={setFiltroFecha}
        />

        {!mostrarHistorial ? (
          <button type="button" className="boton-principal panel-btn-historial" onClick={() => setMostrarHistorial(true)}>
            <History size={18} />
            Ver historial de reservas
          </button>
        ) : (
          <button type="button" className="boton-principal panel-btn-historial" onClick={() => setMostrarHistorial(false)}>
            <ArrowLeft size={18} />
            Volver a reservas
          </button>
        )}

        <ListaReservas
          cargando={cargando}
          error={error}
          grupos={mostrarHistorial ? gruposHistorial : gruposProximas}
          textoVacio={
            mostrarHistorial
              ? "Todavía no hay reservas pasadas."
              : busqueda || filtroFecha !== "todas"
                ? "No hay reservas que coincidan con los filtros."
                : "No hay reservas próximas."
          }
          onConfirmar={(reserva) => void ejecutarCambio(reserva, "Confirmada")}
          onCancelar={pedirCancelacion}
        />

        {pendienteDeCancelar && (
          <Modal
            titulo="Cancelar esta cita"
            textoConfirmar="Sí, cancelar la cita"
            textoCancelar="No, volver"
            peligroso
            ocupado={operando}
            onConfirmar={() => void ejecutarCambio(pendienteDeCancelar, "Cancelada")}
            onCancelar={() => setPendienteDeCancelar(null)}
          >
            <p>
              ¿Seguro que quieres cancelar la cita de <strong>{pendienteDeCancelar.nombre || "este cliente"}</strong>? Se liberará el hueco y se
              eliminará su evento de Google Calendar si existe.
            </p>
          </Modal>
        )}
      </div>
    </div>
  );
}
