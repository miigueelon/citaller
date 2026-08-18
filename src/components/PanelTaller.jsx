import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Wrench,
  Clock,
  User,
  Car,
  Hash,
  RefreshCw,
  Loader2,
  Inbox,
  AlertCircle,
  History,
  ArrowLeft,
} from "lucide-react";

import "./PanelTaller.css";

export default function PanelTaller({ volver }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // --------------------------------------------------
  // CARGAR RESERVAS
  // --------------------------------------------------

  async function cargarReservas() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("reservas")
      .select(`
        id,
        nombre,
        matricula,
        vehiculo,
        servicio,
        descripcion,
        estado,
        dia,
        hora
      `)
      .order("dia", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error cargando reservas:", error);
      setError(error.message);
      setReservas([]);
    } else {
      setReservas(data || []);
    }

    setCargando(false);
  }

  // --------------------------------------------------
  // CAMBIAR ESTADO DE RESERVA
  // --------------------------------------------------

  async function cambiarEstadoReserva(id, nuevoEstado) {
    const { error } = await supabase
      .from("reservas")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando reserva:", error);
      alert("No se pudo actualizar la reserva");
      return;
    }

    await cargarReservas();
  }

  // --------------------------------------------------
  // CARGAR AL ABRIR EL PANEL
  // --------------------------------------------------

  useEffect(() => {
    cargarReservas();
  }, []);

  // --------------------------------------------------
  // FECHA DE HOY
  // --------------------------------------------------

  function obtenerHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }

  // --------------------------------------------------
  // COMPROBAR FIN DE SEMANA
  // --------------------------------------------------

  function esFinDeSemana(fecha) {
    const diaSemana = new Date(fecha + "T00:00:00").getDay();

    return diaSemana === 0 || diaSemana === 6;
  }

  // --------------------------------------------------
  // RESERVAS FUTURAS
  // --------------------------------------------------

  const reservasFuturas = useMemo(() => {
    const hoy = obtenerHoy();

    return reservas.filter((reserva) => {
      if (!reserva.dia) return false;

      const fecha = new Date(reserva.dia + "T00:00:00");
      fecha.setHours(0, 0, 0, 0);

      if (fecha < hoy) {
        return false;
      }

      if (esFinDeSemana(reserva.dia)) {
        return false;
      }

      return true;
    });
  }, [reservas]);

  // --------------------------------------------------
  // HISTORIAL
  // --------------------------------------------------

  const reservasHistorial = useMemo(() => {
    const hoy = obtenerHoy();

    return reservas
      .filter((reserva) => {
        if (!reserva.dia) return false;

        const fecha = new Date(reserva.dia + "T00:00:00");
        fecha.setHours(0, 0, 0, 0);

        return fecha < hoy;
      })
      .sort((a, b) => {
        const fechaA = `${a.dia} ${a.hora || ""}`;
        const fechaB = `${b.dia} ${b.hora || ""}`;

        return fechaB.localeCompare(fechaA);
      });
  }, [reservas]);

  // --------------------------------------------------
  // AGRUPAR RESERVAS
  // --------------------------------------------------

  const reservasAgrupadas = useMemo(() => {
    const grupos = {};

    reservasFuturas.forEach((reserva) => {
      if (!grupos[reserva.dia]) {
        grupos[reserva.dia] = [];
      }

      grupos[reserva.dia].push(reserva);
    });

    return Object.entries(grupos);
  }, [reservasFuturas]);

  // --------------------------------------------------
  // TÍTULO DE FECHA
  // --------------------------------------------------

  function tituloFecha(fecha) {
    const hoy = obtenerHoy();

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const fechaActual = new Date(fecha + "T00:00:00");
    fechaActual.setHours(0, 0, 0, 0);

    if (fechaActual.getTime() === hoy.getTime()) {
      return "HOY";
    }

    if (fechaActual.getTime() === manana.getTime()) {
      return "MAÑANA";
    }

    return fechaActual.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  // --------------------------------------------------
  // FORMATO HISTORIAL
  // --------------------------------------------------

  function fechaHistorial(fecha) {
    const fechaActual = new Date(fecha + "T00:00:00");

    return fechaActual.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // --------------------------------------------------
  // TARJETA DE RESERVA
  // --------------------------------------------------

  function TarjetaReserva({ reserva }) {
    return (
      <div className="tarjeta-reserva">

        <div className="tarjeta-header">

          <div className="tarjeta-hora">

            <Clock
              className="tarjeta-icon"
              size={18}
            />

            <span className="tarjeta-hora-texto">
              {reserva.hora?.substring(0, 5) || "--:--"}
            </span>

          </div>

          <span
  className={`estado-badge estado-${(
    reserva.estado || "Pendiente"
  ).toLowerCase()}`}
>
  <span className="estado-punto"></span>
  {reserva.estado || "Pendiente"}
</span>

        </div>

        <div className="tarjeta-grid">

          <div className="campo-item">

            <User
              className="campo-icon"
              size={16}
            />

            <div className="campo-contenido">

              <p className="campo-label">
                Cliente
              </p>

              <p className="campo-valor">
                {reserva.nombre || "-"}
              </p>

            </div>

          </div>

          <div className="campo-item">

            <Hash
              className="campo-icon"
              size={16}
            />

            <div className="campo-contenido">

              <p className="campo-label">
                Matrícula
              </p>

              <p className="campo-valor">
                {reserva.matricula || "-"}
              </p>

            </div>

          </div>

          <div className="campo-item">

            <Car
              className="campo-icon"
              size={16}
            />

            <div className="campo-contenido">

              <p className="campo-label">
                Vehículo
              </p>

              <p className="campo-valor">
                {reserva.vehiculo || "-"}
              </p>

            </div>

          </div>

          <div className="campo-item">

            <Wrench
              className="campo-icon"
              size={16}
            />

            <div className="campo-contenido">

              <p className="campo-label">
                Servicio
              </p>

              <p className="campo-valor">
                {reserva.servicio || "-"}
              </p>

            </div>

          </div>

               </div>

        {reserva.descripcion && (
          <div className="descripcion-reserva">

            <p className="descripcion-reserva-titulo">
              {reserva.servicio === "Otro"
                ? "QUÉ NECESITA"
                : "DESCRIPCIÓN"}
            </p>

            <p className="descripcion-reserva-texto">
              {reserva.descripcion}
            </p>

          </div>
        )}

        {/* ACCIONES */}

        {reserva.estado === "Pendiente" && (

          <div className="tarjeta-acciones">

            <button
              className="btn-confirmar"
              onClick={() =>
                cambiarEstadoReserva(
                  reserva.id,
                  "Confirmada"
                )
              }
            >
              ✓ Confirmar
            </button>

            <button
              className="btn-cancelar"
              onClick={() =>
                cambiarEstadoReserva(
                  reserva.id,
                  "Cancelada"
                )
              }
            >
              ✕ Cancelar
            </button>

          </div>

        )}

      </div>
    );
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="panel-taller-container">

      <div className="panel-taller-contenido">

        {/* VOLVER */}

        <div className="volver-card">

          <button
            className="volver-menu"
            onClick={volver}
          >
            ← Menú
          </button>

        </div>

        {/* LOGO */}

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

        {/* CABECERA */}

        <div className="panel-header">

          <div>

            <h1 className="panel-titulo">

              {mostrarHistorial
                ? "Historial de reservas"
                : "Panel del Taller"}

            </h1>

            <p className="panel-subtitulo">

              {mostrarHistorial
                ? `${reservasHistorial.length} ${
                    reservasHistorial.length === 1
                      ? "reserva pasada"
                      : "reservas pasadas"
                  }`
                : `${reservasFuturas.length} ${
                    reservasFuturas.length === 1
                      ? "reserva"
                      : "reservas"
                  }`}

            </p>

          </div>

          <button
            className="panel-btn-actualizar"
            onClick={cargarReservas}
            disabled={cargando}
          >

            <RefreshCw
              className={`panel-btn-icon ${
                cargando ? "spin" : ""
              }`}
            />

            Actualizar

          </button>

        </div>

        {/* HISTORIAL / VOLVER */}

        {!mostrarHistorial ? (

          <button
            className="panel-btn-historial"
            onClick={() => setMostrarHistorial(true)}
          >

            <History size={18} />

            Ver historial de reservas

          </button>

        ) : (

          <button
            className="panel-btn-historial"
            onClick={() => setMostrarHistorial(false)}
          >

            <ArrowLeft size={18} />

            Volver a reservas

          </button>

        )}

        {/* CARGANDO */}

        {cargando && (

          <div className="panel-estado panel-cargando">

            <Loader2 className="panel-estado-icon spin" />

            <p>
              Cargando reservas...
            </p>

          </div>

        )}

        {/* ERROR */}

        {!cargando && error && (

          <div className="panel-error">

            <AlertCircle className="panel-error-icon" />

            <div>

              <p className="panel-error-titulo">
                Error al cargar reservas
              </p>

              <p className="panel-error-texto">
                {error}
              </p>

            </div>

          </div>

        )}

        {/* PANEL PRINCIPAL */}

        {!cargando &&
          !error &&
          !mostrarHistorial && (

          <>

            {reservasAgrupadas.length === 0 ? (

              <div className="panel-estado panel-vacio">

                <Inbox className="panel-estado-icon" />

                <p>
                  No hay reservas próximas.
                </p>

              </div>

            ) : (

              <div className="panel-grupos">

                {reservasAgrupadas.map(
                  ([fecha, items]) => (

                    <div
                      className="panel-grupo"
                      key={fecha}
                    >

                      <h3 className="panel-grupo-titulo">
                        {tituloFecha(fecha)}
                      </h3>

                      <div className="panel-grupo-items">

                        {items.map((reserva) => (

                          <TarjetaReserva
                            key={reserva.id}
                            reserva={reserva}
                          />

                        ))}

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </>

        )}

        {/* HISTORIAL */}

        {!cargando &&
          !error &&
          mostrarHistorial && (

          <>

            {reservasHistorial.length === 0 ? (

              <div className="panel-estado panel-vacio">

                <Inbox className="panel-estado-icon" />

                <p>
                  Todavía no hay reservas pasadas.
                </p>

              </div>

            ) : (

              <div className="panel-grupos">

                {reservasHistorial.map((reserva) => (

                  <div
                    className="panel-grupo"
                    key={reserva.id}
                  >

                    <h3 className="panel-grupo-titulo">

                      {fechaHistorial(reserva.dia)}

                    </h3>

                    <div className="panel-grupo-items">

                      <TarjetaReserva
                        reserva={reserva}
                      />

                    </div>

                  </div>

                ))}

              </div>

            )}

          </>

        )}

      </div>

    </div>
  );
}