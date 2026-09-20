import { useEffect, useMemo, useState } from "react";
import {
  EDGE_FUNCTIONS,
  esUrlDeGoogle,
} from "../features/integraciones/edgeFunctions";
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
  Search,
  Gauge,
} from "lucide-react";

import "./PanelTaller.css";

export default function PanelTaller({
  slug,
  supabaseClient,
  tallerId,
}) {
  const supabase = supabaseClient;

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
const [taller, setTaller] = useState(null);
const [filtroEstado, setFiltroEstado] = useState("Pendiente");
const [busqueda, setBusqueda] = useState("");
const [filtroFecha, setFiltroFecha] = useState("todas");

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
    taller_id,
    nombre,
    matricula,
    vehiculo,
    servicio,
    descripcion,
    kilometros,
    estado,
    dia,
    hora
  `)
  .eq("taller_id", tallerId)
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
    const reservaActual = reservas.find((reserva) => reserva.id === id);

    // Primero el cambio de estado. `select` devuelve las filas afectadas: si no hay ninguna,
    // la base de datos ha rechazado el cambio (por ejemplo, una cita ya cancelada no se
    // reabre) y no hay que disparar WhatsApp ni Google Calendar.
    const { data: actualizadas, error } = await supabase
      .from("reservas")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", id)
      .eq("taller_id", tallerId)
      .select("id");

    if (error) {
      console.error("Error actualizando reserva:", error);
      alert("No se pudo actualizar la reserva");
      return;
    }

    if (!actualizadas || actualizadas.length === 0) {
      console.warn("El cambio de estado no afectó a ninguna reserva:", id, nuevoEstado);
      alert(
        "Esta cita ya no se puede cambiar. Si estaba cancelada, hay que crear una cita nueva."
      );
      await cargarReservas();
      return;
    }

    // Si la cita estaba confirmada y se cancela, se borra su evento de Google Calendar.
    // Es el mejor esfuerzo: la cita ya está cancelada, así que un fallo de Google solo se
    // avisa (la Edge Function responde ok con un aviso).
    if (nuevoEstado === "Cancelada" && reservaActual?.estado === "Confirmada") {
      try {
        const { data: cancelarData, error: cancelarError } =
          await supabase.functions.invoke(EDGE_FUNCTIONS.cancelarEventoGoogle, {
            body: {
              reserva_id: id,
            },
          });

        if (cancelarError || !cancelarData?.ok) {
          console.error(
            "La cita se canceló, pero falló la llamada a Google Calendar:",
            cancelarError || cancelarData
          );
        } else if (cancelarData.aviso) {
          console.warn("Google Calendar:", cancelarData.aviso);
          alert(`La cita está cancelada. ${cancelarData.aviso}.`);
        }
      } catch (cancelarError) {
        console.error(
          "La cita se canceló, pero ocurrió un error con Google Calendar:",
          cancelarError
        );
      }
    }

    if (nuevoEstado === "Confirmada") {
      try {
        const { data: whatsappData, error: whatsappError } =
          await supabase.functions.invoke(EDGE_FUNCTIONS.enviarWhatsappConfirmacion, {
            body: {
              reserva_id: id,
            },
          });

        if (whatsappError) {
          console.error(
            "La reserva se confirmó, pero falló la llamada a WhatsApp:",
            whatsappError
          );
        } else {
          console.log("Respuesta WhatsApp:", whatsappData);
        }
      } catch (whatsappError) {
        console.error(
          "La reserva se confirmó, pero ocurrió un error con WhatsApp:",
          whatsappError
        );
      }
    }

    // La función responde con un error claro si el taller no tiene Google conectado.
    if (nuevoEstado === "Confirmada") {
      try {
        const { data: calendarData, error: calendarError } =
          await supabase.functions.invoke(EDGE_FUNCTIONS.crearEventoGoogle, {
            body: {
              reserva_id: id,
            },
          });

        if (calendarError) {
          console.error(
            "La reserva se confirmó, pero falló Google Calendar:",
            calendarError
          );
        } else {
          console.log(
            "Respuesta Google Calendar:",
            calendarData
          );
        }
      } catch (calendarError) {
        console.error(
          "La reserva se confirmó, pero ocurrió un error con Google Calendar:",
          calendarError
        );
      }
    }

    await cargarReservas();
  }

  // --------------------------------------------------
  // CONECTAR GOOGLE CALENDAR
  // --------------------------------------------------

  async function conectarGoogleCalendar() {
    try {
      const { data, error } = await supabase.functions.invoke(
        EDGE_FUNCTIONS.conectarGoogleCalendar,
        {
          body: {
            taller_id: tallerId,
            // A dónde debe devolvernos Google al terminar (la función valida el origen).
            volver_a: `${window.location.origin}/${slug}/panel`,
          },
        }
      );

      if (error) {
        console.error("Error conectando Google Calendar:", error);
        alert("No se pudo iniciar la conexión con Google Calendar.");
        return;
      }

      if (!data?.ok || !data?.auth_url) {
        console.error("Respuesta inesperada de Google Calendar:", data);
        alert("No se pudo obtener el enlace de autorización de Google.");
        return;
      }

      // Nunca seguir un enlace de autorización que no sea de Google.
      if (!esUrlDeGoogle(data.auth_url)) {
        console.error("auth_url inesperada:", data.auth_url);
        alert("El enlace de autorización recibido no es de Google.");
        return;
      }

      window.location.href = data.auth_url;
    } catch (error) {
      console.error("Error conectando Google Calendar:", error);
      alert("Ocurrió un error al conectar Google Calendar.");
    }
  }

  // --------------------------------------------------
  // CARGAR AL ABRIR EL PANEL
  // --------------------------------------------------

  useEffect(() => {
    cargarReservas();
  }, []);

  // --------------------------------------------------
  // VUELTA DE GOOGLE CALENDAR (?calendar=connected|error)
  // --------------------------------------------------

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("calendar");

    if (!resultado) return;

    if (resultado === "connected") {
      alert("Google Calendar conectado correctamente.");
    } else {
      const motivo = params.get("motivo");
      console.error("Google Calendar no se conectó:", motivo);
      alert(
        motivo === "access_denied"
          ? "No se conectó Google Calendar: no diste permiso a CiTaller."
          : "No se pudo conectar Google Calendar. Vuelve a intentarlo."
      );
    }

    // Quitar los parámetros para que el aviso no se repita al recargar.
    params.delete("calendar");
    params.delete("motivo");

    const consulta = params.toString();

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${consulta ? `?${consulta}` : ""}`
    );
  }, []);
  useEffect(() => {
  async function cargarDatosTaller() {
    const { data, error } = await supabase
      .from("talleres")
      .select(`
        id,
        nombre,
        direccion,
        telefono,
        horario_texto,
        valoracion,
        numero_resenas
      `)
      .eq("id", tallerId)
      .single();

    if (error) {
      console.error("Error cargando taller:", error);
      setTaller(null);
    } else {
      setTaller(data);
    }
  }

  cargarDatosTaller();
}, [tallerId]);

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
  const reservasPendientes = useMemo(() => {
  return reservasFuturas.filter(
    (reserva) => reserva.estado === "Pendiente"
  );
}, [reservasFuturas]);

const reservasConfirmadas = useMemo(() => {
  return reservasFuturas.filter(
    (reserva) => reserva.estado === "Confirmada"
  );
}, [reservasFuturas]);


const reservasCanceladas = useMemo(() => {
  return reservasFuturas.filter(
    (reserva) => reserva.estado === "Cancelada"
  );
}, [reservasFuturas]);

// Total histórico de reservas válidas:
// pendientes + confirmadas + reservas pasadas.
// Las canceladas NO cuentan.
const totalReservasValidas = useMemo(() => {
  return reservas.filter(
    (reserva) => reserva.estado !== "Cancelada"
  ).length;
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

  function agruparPorFecha(lista) {
  const grupos = {};

  lista.forEach((reserva) => {
    if (!grupos[reserva.dia]) {
      grupos[reserva.dia] = [];
    }

    grupos[reserva.dia].push(reserva);
  });

  return Object.entries(grupos);
}

const reservasSegunEstado = useMemo(() => {
  if (filtroEstado === "Pendiente") return reservasPendientes;
  if (filtroEstado === "Confirmada") return reservasConfirmadas;
  return reservasCanceladas;
}, [
  filtroEstado,
  reservasPendientes,
  reservasConfirmadas,
  reservasCanceladas,
]);

const reservasFiltradas = useMemo(() => {
  const texto = busqueda.trim().toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const dentroDe7Dias = new Date(hoy);
  dentroDe7Dias.setDate(dentroDe7Dias.getDate() + 7);

  return reservasSegunEstado.filter((reserva) => {
    const nombre = (reserva.nombre || "").toLowerCase();
    const matricula = (reserva.matricula || "").toLowerCase();
    const vehiculo = (reserva.vehiculo || "").toLowerCase();

    const coincideBusqueda =
      !texto ||
      nombre.includes(texto) ||
      matricula.includes(texto) ||
      vehiculo.includes(texto);

    const fechaReserva = new Date(`${reserva.dia}T00:00:00`);

    let coincideFecha = true;

    if (filtroFecha === "hoy") {
      coincideFecha = fechaReserva.getTime() === hoy.getTime();
    } else if (filtroFecha === "manana") {
      coincideFecha = fechaReserva.getTime() === manana.getTime();
    } else if (filtroFecha === "7dias") {
      coincideFecha =
        fechaReserva >= hoy &&
        fechaReserva < dentroDe7Dias;
    }

    return coincideBusqueda && coincideFecha;
  });
}, [reservasSegunEstado, busqueda, filtroFecha]);

const reservasMostradas = useMemo(
  () => agruparPorFecha(reservasFiltradas),
  [reservasFiltradas]
);


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

          {tallerId === 1 &&
            reserva.kilometros !== null &&
            reserva.kilometros !== undefined && (
              <div className="campo-item">

                <Gauge
                  className="campo-icon"
                  size={16}
                />

                <div className="campo-contenido">

                  <p className="campo-label">
                    Kilómetros
                  </p>

                  <p className="campo-valor">
                    {Number(reserva.kilometros).toLocaleString("es-ES")} km
                  </p>

                </div>

              </div>
            )}

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

        {reserva.estado === "Confirmada" && (

  <div className="tarjeta-acciones">

    <button
      className="btn-cancelar"
      onClick={() => {
        const confirmarCancelacion = window.confirm(
          "¿Seguro que quieres cancelar esta cita? Se liberará el hueco y se eliminará su evento de Google Calendar si existe."
        );

        if (confirmarCancelacion) {
          cambiarEstadoReserva(
            reserva.id,
            "Cancelada"
          );
        }
      }}
    >
      ✕ Cancelar cita
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
    ? `Historial · ${taller?.nombre || "Taller"}`
    : `Panel · ${taller?.nombre || "Taller"}`}

</h1>

            <p className="panel-subtitulo">

              {mostrarHistorial
                ? `${reservasHistorial.length} ${
                    reservasHistorial.length === 1
                      ? "reserva pasada"
                      : "reservas pasadas"
                  }`
                : `${totalReservasValidas} ${
                    totalReservasValidas === 1
                      ? "reserva"
                      : "reservas"
                  }`}

            </p>

          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              width: "100%",
            }}
          >
            <button
              className="panel-btn-actualizar"
              onClick={cargarReservas}
              disabled={cargando}
              style={{ flex: 1 }}
            >
              <RefreshCw
                className={`panel-btn-icon ${
                  cargando ? "spin" : ""
                }`}
              />

              Actualizar
            </button>

            <button
              className="panel-btn-actualizar"
              onClick={() => {
                window.location.href = `/${slug}`;
              }}
              style={{ flex: 1 }}
            >
              + Nueva cita
            </button>

            {/* Disponible para cualquier taller: la conexión se guarda por taller.
                En la fase 3 el botón dependerá de la configuración del taller en la base de datos. */}
            <button
              className="panel-btn-actualizar"
              onClick={conectarGoogleCalendar}
              style={{ flex: 1 }}
            >
              Conectar Google Calendar
            </button>

            <button
              className="panel-btn-actualizar"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = `/${slug}/panel`;
              }}
              style={{ flex: 1 }}
            >
              Cerrar sesión
            </button>
          </div>

        </div>
        <div className="filtros-reservas">

  <button
    className={filtroEstado === "Pendiente" ? "filtro-activo" : ""}
    onClick={() => setFiltroEstado("Pendiente")}
  >
    Pendientes ({reservasPendientes.length})
  </button>

  <button
    className={filtroEstado === "Confirmada" ? "filtro-activo" : ""}
    onClick={() => setFiltroEstado("Confirmada")}
  >
    Confirmadas ({reservasConfirmadas.length})
  </button>

  <button
    className={filtroEstado === "Cancelada" ? "filtro-activo" : ""}
    onClick={() => setFiltroEstado("Cancelada")}
  >
    Canceladas ({reservasCanceladas.length})
  </button>

</div>

        <div className="buscador-reservas">
          <Search className="buscador-reservas-icono" size={18} />

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, matrícula o vehículo..."
            aria-label="Buscar reservas"
          />

          {busqueda && (
            <button
              type="button"
              className="buscador-reservas-limpiar"
              onClick={() => setBusqueda("")}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="filtro-fecha-rapido">
          <button
            type="button"
            className={filtroFecha === "todas" ? "activo" : ""}
            onClick={() => setFiltroFecha("todas")}
          >
            Todas
          </button>

          <button
            type="button"
            className={filtroFecha === "hoy" ? "activo" : ""}
            onClick={() => setFiltroFecha("hoy")}
          >
            Hoy
          </button>

          <button
            type="button"
            className={filtroFecha === "manana" ? "activo" : ""}
            onClick={() => setFiltroFecha("manana")}
          >
            Mañana
          </button>

          <button
            type="button"
            className={filtroFecha === "7dias" ? "activo" : ""}
            onClick={() => setFiltroFecha("7dias")}
          >
            Próximos 7 días
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

            {reservasMostradas.length === 0 ? (

              <div className="panel-estado panel-vacio">

                <Inbox className="panel-estado-icon" />

                <p>
                  {busqueda || filtroFecha !== "todas"
                    ? "No hay reservas que coincidan con los filtros."
                    : "No hay reservas próximas."}
                </p>

              </div>

            ) : (

              <div className="panel-grupos">

                {reservasMostradas.map(
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