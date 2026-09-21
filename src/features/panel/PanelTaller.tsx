import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History } from "lucide-react";
import { useAuth } from "@/app/providers/useAuth";
import { useTaller } from "@/app/providers/useTaller";
import { Alerta } from "@/components/Alerta";
import { Modal } from "@/components/Modal";
import { hoy, sumarDias } from "@/lib/fechas";
import { cargarMiembros, cargarTextosWhatsapp } from "./api";
import { CabeceraPanel } from "./componentes/CabeceraPanel";
import { CitasManana } from "./componentes/CitasManana";
import { FiltrosReservas } from "./componentes/FiltrosReservas";
import { ListaReservas } from "./componentes/ListaReservas";
import { NuevaCitaModal } from "./componentes/NuevaCitaModal";
import { agruparPorDia, filtrarReservas, historial, porEstado, resumenCabecera, reservasFuturas, tituloGrupo, tituloHistorial } from "./filtros";
import { datosDeReserva, enlaceWhatsapp, TEXTOS_VACIOS, textoMensaje, tipoMensajeDeReserva, type TextosWhatsapp, type TipoMensaje } from "./textosWhatsapp";
import type { FiltroEstado, FiltroFecha, MiembroTaller, ReservaPanel, TipoAviso } from "./tipos";
import { useConexionGoogle } from "./useConexionGoogle";
import { useReservasTaller, type ResultadoAccion } from "./useReservasTaller";
import "./panel.css";

interface Resultado {
  tipo: "ok" | "aviso" | "error";
  lineas: string[];
  /** Modo enlace: reserva a la que toca avisar por WhatsApp desde el móvil. */
  whatsappPendiente?: { reserva: ReservaPanel; tipo: TipoAviso };
}

/** Panel del taller: reservas próximas por estado, búsqueda, historial, cita manual y acciones. */
export function PanelTaller() {
  const taller = useTaller();
  const { cliente, cerrarSesion } = useAuth();

  const { reservas, cargando, error, recargar, confirmar, cancelar, crearManual, marcarListo, marcarAviso } = useReservasTaller(cliente, taller.id);
  const google = useConexionGoogle(cliente, taller.id, taller.slug);
  const modoEnlace = taller.whatsapp_modo === "enlace";

  const [textos, setTextos] = useState<TextosWhatsapp>(TEXTOS_VACIOS);
  useEffect(() => {
    if (!modoEnlace) return;
    let vigente = true;
    void cargarTextosWhatsapp(cliente, taller.id).then((datos) => {
      if (vigente) setTextos(datos);
    });
    return () => {
      vigente = false;
    };
  }, [cliente, taller.id, modoEnlace]);

  // Quién puede apuntar citas a mano. Sin miembros, "Nueva cita" no pregunta quién la apunta.
  const [miembros, setMiembros] = useState<MiembroTaller[]>([]);
  useEffect(() => {
    let vigente = true;
    void cargarMiembros(cliente, taller.id).then((datos) => {
      if (vigente) setMiembros(datos);
    });
    return () => {
      vigente = false;
    };
  }, [cliente, taller.id]);

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todas");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendienteDeCancelar, setPendienteDeCancelar] = useState<ReservaPanel | null>(null);
  const [nuevaCita, setNuevaCita] = useState(false);
  const [operando, setOperando] = useState(false);

  // "Hoy" se recalcula cada minuto, por si el panel queda abierto de un día para otro.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  const futuras = useMemo(() => reservasFuturas(reservas, ahora), [reservas, ahora]);
  const contadores = useMemo(
    () => ({
      Pendiente: porEstado(futuras, "Pendiente").length,
      Confirmada: porEstado(futuras, "Confirmada").length,
      Cancelada: porEstado(futuras, "Cancelada").length,
    }),
    [futuras],
  );

  const gruposProximas = useMemo(
    () =>
      agruparPorDia(filtrarReservas(porEstado(futuras, filtroEstado), { busqueda, filtroFecha }, ahora)).map(
        ([dia, items]) => [tituloGrupo(dia, ahora), items] as [string, ReservaPanel[]],
      ),
    [futuras, filtroEstado, busqueda, filtroFecha, ahora],
  );

  const resumen = useMemo(() => resumenCabecera(reservas, ahora), [reservas, ahora]);

  // Historial: solo confirmadas, agrupadas por día; el buscador también vale aquí.
  const pasadas = useMemo(() => historial(reservas, ahora), [reservas, ahora]);
  const gruposHistorial = useMemo(
    () =>
      agruparPorDia(filtrarReservas(pasadas, { busqueda, filtroFecha: "todas" }, ahora)).map(
        ([dia, items]) => [tituloHistorial(dia), items] as [string, ReservaPanel[]],
      ),
    [pasadas, busqueda, ahora],
  );

  const citasManana = useMemo(() => {
    if (!modoEnlace) return [];
    const manana = sumarDias(hoy(ahora), 1);
    return reservas.filter((r) => r.dia === manana && r.estado === "Confirmada" && r.telefono);
  }, [reservas, ahora, modoEnlace]);

  /** Modo enlace: abre WhatsApp con el mensaje escrito (desde un clic, para que el navegador no lo bloquee). */
  function abrirWhatsapp(reserva: ReservaPanel, tipo: TipoMensaje) {
    if (!reserva.telefono) return;
    const texto = textoMensaje(tipo, textos, datosDeReserva(reserva, taller, window.location.origin));
    window.open(enlaceWhatsapp(reserva.telefono, texto), "_blank", "noopener");
  }

  /** Abre WhatsApp y apunta el aviso: la tarjeta pasa a "✓ Confirmación avisada a las 12:30". */
  async function avisarWhatsapp(reserva: ReservaPanel, tipo: TipoAviso) {
    if (!reserva.telefono) return;
    abrirWhatsapp(reserva, tipo);
    const res = await marcarAviso(reserva.id, tipo);
    if (!res.ok) setResultado({ tipo: "error", lineas: res.avisos });
  }

  function mostrarResultado(res: ResultadoAccion, reserva: ReservaPanel | undefined, accion: "confirmar" | "cancelar") {
    const lineas = [...res.logros, ...res.avisos];
    const tipoPendiente = modoEnlace && reserva ? tipoMensajeDeReserva(reserva) : null;
    const whatsappPendiente = res.ok && tipoPendiente && reserva ? { reserva, tipo: tipoPendiente } : undefined;
    if (whatsappPendiente) {
      lineas.push(accion === "confirmar" ? "Cita confirmada. Avisa al cliente por WhatsApp desde tu móvil:" : "Cita cancelada. Avisa al cliente por WhatsApp desde tu móvil:");
    } else if (res.ok && lineas.length === 0) {
      lineas.push(accion === "confirmar" ? "Cita confirmada." : "Cita cancelada.");
    }
    setResultado({ tipo: !res.ok ? "error" : res.avisos.length > 0 ? "aviso" : "ok", lineas, whatsappPendiente });
  }

  async function ejecutarConfirmar(reserva: ReservaPanel) {
    setOperando(true);
    const res = await confirmar(reserva.id);
    setOperando(false);
    mostrarResultado(res, { ...reserva, estado: "Confirmada" }, "confirmar");
  }

  async function ejecutarCancelar(reserva: ReservaPanel) {
    setOperando(true);
    const res = await cancelar(reserva.id);
    setOperando(false);
    setPendienteDeCancelar(null);
    mostrarResultado(res, { ...reserva, estado: "Cancelada", cancelada_por: "taller" }, "cancelar");
  }

  /** "Vehículo listo": la cita queda terminada (deja de contar en "Hoy") y, en modo enlace, se avisa. */
  async function ejecutarListo(reserva: ReservaPanel, listo: boolean) {
    // WhatsApp primero, dentro del clic: abierto después de esperar a la base de datos, el navegador lo bloquea.
    if (listo && modoEnlace) abrirWhatsapp(reserva, "listo");
    setOperando(true);
    const res = await marcarListo(reserva.id, listo);
    setOperando(false);
    if (!res.ok) setResultado({ tipo: "error", lineas: res.avisos });
  }

  async function guardarCitaManual(datos: Parameters<typeof crearManual>[0]): Promise<ResultadoAccion> {
    setOperando(true);
    const res = await crearManual(datos);
    setOperando(false);
    if (res.ok) {
      setNuevaCita(false);
      // Para el aviso de WhatsApp en modo enlace bastan los datos recién guardados y el token.
      const creada: ReservaPanel | undefined = res.reservaId
        ? {
            ...datos,
            id: res.reservaId,
            taller_id: taller.id,
            telefono: datos.telefono || null,
            descripcion: datos.descripcion || null,
            estado: "Confirmada",
            creada_por: "taller",
            apuntada_por: miembros.find((miembro) => miembro.id === datos.miembro_id)?.nombre ?? null,
            cancelada_por: null,
            cancelada_en: null,
            confirmada_en: null,
            listo_en: null,
            token_publico: res.tokenPublico ?? "",
            whatsapp_confirmacion_enviada: false,
            whatsapp_confirmacion_fecha: null,
            whatsapp_cancelacion_enviada: false,
            whatsapp_cancelacion_fecha: null,
            whatsapp_recordatorio_enviado: false,
            whatsapp_recordatorio_fecha: null,
            whatsapp_error: null,
            google_event_id: null,
            google_error: null,
          }
        : undefined;
      mostrarResultado(res, creada, "confirmar");
    }
    return res;
  }

  function pedirCancelacion(reserva: ReservaPanel) {
    // Cancelar una pendiente no pide confirmación (comportamiento heredado); una confirmada, sí.
    if (reserva.estado === "Confirmada") setPendienteDeCancelar(reserva);
    else void ejecutarCancelar(reserva);
  }

  return (
    <div className="panel-taller-container">
      <div className="panel-taller-contenido">
        <CabeceraPanel
          nombreTaller={taller.nombre}
          modoHistorial={mostrarHistorial}
          resumen={resumen}
          totalHistorial={pasadas.length}
          cargando={cargando}
          onActualizar={() => void recargar()}
          onNuevaCita={() => setNuevaCita(true)}
          onConectarGoogle={() => void google.conectar()}
          onCerrarSesion={() => void cerrarSesion()}
        />

        {google.mensaje && (
          <Alerta tipo={google.mensaje.tipo} onCerrar={google.cerrarMensaje}>
            {google.mensaje.texto}
          </Alerta>
        )}

        {resultado && (
          <Alerta tipo={resultado.tipo} onCerrar={() => setResultado(null)}>
            {resultado.lineas.map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
            {resultado.whatsappPendiente && (
              <button
                type="button"
                className="btn-whatsapp"
                onClick={() => {
                  const { reserva, tipo } = resultado.whatsappPendiente!;
                  const actual = reservas.find((r) => r.id === reserva.id) ?? reserva;
                  void avisarWhatsapp(actual, tipo);
                }}
              >
                Abrir WhatsApp con el mensaje
              </button>
            )}
          </Alerta>
        )}

        {modoEnlace && !mostrarHistorial && <CitasManana reservas={citasManana} onRecordar={(reserva) => void avisarWhatsapp(reserva, "recordatorio")} />}

        <FiltrosReservas
          filtroEstado={filtroEstado}
          onFiltroEstado={setFiltroEstado}
          contadores={contadores}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          filtroFecha={filtroFecha}
          onFiltroFecha={setFiltroFecha}
          soloBusqueda={mostrarHistorial}
        />

        {!mostrarHistorial ? (
          <button type="button" className="panel-btn-historial" onClick={() => setMostrarHistorial(true)}>
            <History size={16} />
            Ver historial de reservas
          </button>
        ) : (
          <button type="button" className="panel-btn-historial" onClick={() => setMostrarHistorial(false)}>
            <ArrowLeft size={18} />
            Volver a reservas
          </button>
        )}

        <ListaReservas
          cargando={cargando}
          error={error}
          grupos={mostrarHistorial ? gruposHistorial : gruposProximas}
          campos={taller.campos}
          ocupado={operando}
          textoVacio={
            mostrarHistorial
              ? busqueda
                ? "No hay citas pasadas que coincidan con la búsqueda."
                : "Todavía no hay citas pasadas."
              : busqueda || filtroFecha !== "todas"
                ? "No hay reservas que coincidan con los filtros."
                : "No hay reservas próximas."
          }
          onConfirmar={(reserva) => void ejecutarConfirmar(reserva)}
          onCancelar={pedirCancelacion}
          onAvisarWhatsapp={
            modoEnlace
              ? (reserva) => {
                  const tipo = tipoMensajeDeReserva(reserva);
                  if (tipo) void avisarWhatsapp(reserva, tipo);
                }
              : undefined
          }
          onVehiculoListo={(reserva) => void ejecutarListo(reserva, true)}
          onDeshacerListo={(reserva) => void ejecutarListo(reserva, false)}
        />

        {pendienteDeCancelar && (
          <Modal
            titulo="Cancelar esta cita"
            textoConfirmar="Sí, cancelar la cita"
            textoCancelar="No, volver"
            peligroso
            ocupado={operando}
            onConfirmar={() => void ejecutarCancelar(pendienteDeCancelar)}
            onCancelar={() => setPendienteDeCancelar(null)}
          >
            <p>
              ¿Seguro que quieres cancelar la cita de <strong>{pendienteDeCancelar.nombre || "este cliente"}</strong>? Se liberará el hueco
              {pendienteDeCancelar.google_event_id ? ", se eliminará su evento de Google Calendar" : ""}
              {taller.whatsapp_modo === "api" && pendienteDeCancelar.telefono ? " y se avisará al cliente por WhatsApp" : ""}.
            </p>
          </Modal>
        )}

        {nuevaCita && <NuevaCitaModal miembros={miembros} ocupado={operando} onGuardar={guardarCitaManual} onCerrar={() => setNuevaCita(false)} />}
      </div>
    </div>
  );
}
