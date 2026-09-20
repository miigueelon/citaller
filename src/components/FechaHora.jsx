import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabasePublic } from "@/lib/supabase/client";

export default function FechaHora({
  reserva,
  setReserva,
  volver,
  continuar,
}) {
  // ==========================================
  // ESTADOS
  // ==========================================

  const [horariosTaller, setHorariosTaller] = useState([]);
  const [reservasPorHora, setReservasPorHora] = useState({});
  const [totalReservasDia, setTotalReservasDia] = useState(0);
  const [festivos, setFestivos] = useState([]);
  const [capacidad, setCapacidad] = useState(1);

  const [cargandoHorarios, setCargandoHorarios] = useState(true);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const [ahora, setAhora] = useState(new Date());

  // ==========================================
  // TALLER ACTUAL
  // ==========================================

  const tallerId = reserva.taller_id;

  // ==========================================
  // ACTUALIZAR HORA ACTUAL
  // ==========================================

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhora(new Date());
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  // ==========================================
  // CARGAR CAPACIDAD DEL TALLER
  // ==========================================

  useEffect(() => {
    async function cargarTaller() {
      if (!tallerId) {
        setCapacidad(1);
        return;
      }

      const { data, error } = await supabasePublic
        .from("talleres_publicos")
        .select("capacidad_simultanea")
        .eq("id", tallerId)
        .single();

      if (error) {
        console.error(
          "Error cargando capacidad del taller:",
          error
        );

        setCapacidad(1);
        return;
      }

      setCapacidad(
        Number(data?.capacidad_simultanea) || 1
      );
    }

    cargarTaller();
  }, [tallerId]);

  // ==========================================
  // CARGAR HORARIOS DEL TALLER
  // ==========================================

  useEffect(() => {
    async function cargarHorarios() {
      if (!tallerId) {
        setHorariosTaller([]);
        setCargandoHorarios(false);
        return;
      }

      setCargandoHorarios(true);

      const { data, error } = await supabasePublic
        .from("horarios_taller")
        .select("dia_semana, hora, aviso_tarde")
        .eq("taller_id", tallerId)
        .order("hora");

      if (error) {
        console.error(
          "Error cargando horarios:",
          error
        );

        setHorariosTaller([]);
      } else {
        setHorariosTaller(data || []);
      }

      setCargandoHorarios(false);
    }

    cargarHorarios();
  }, [tallerId]);

  // ==========================================
  // CARGAR FESTIVOS DEL TALLER
  // ==========================================

  useEffect(() => {
    async function cargarFestivos() {
      if (!tallerId) {
        setFestivos([]);
        return;
      }

      const { data, error } = await supabasePublic
        .from("festivos_taller")
        .select("fecha, nombre")
        .eq("taller_id", tallerId)
        .order("fecha");

      if (error) {
        console.error(
          "Error cargando festivos:",
          error
        );

        setFestivos([]);
      } else {
        setFestivos(data || []);
      }
    }

    cargarFestivos();
  }, [tallerId]);

  // ==========================================
  // FORMATEAR FECHA
  // ==========================================

  const formatearFecha = (fecha) => {
    const año = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;
  };

  // ==========================================
  // BUSCAR FESTIVO
  // ==========================================

  const obtenerFestivo = (fecha) => {
    const fechaFormateada =
      formatearFecha(fecha);

    return festivos.find(
      (festivo) =>
        festivo.fecha === fechaFormateada
    );
  };

  // ==========================================
  // COMPROBAR SI UNA HORA YA HA PASADO
  // ==========================================

  const horaYaPasada = (hora) => {
    if (!reserva.dia) {
      return false;
    }

    const hoy = formatearFecha(ahora);

    if (reserva.dia !== hoy) {
      return false;
    }

    const [horaReserva, minutoReserva] =
      hora.split(":").map(Number);

    const minutosActuales =
      ahora.getHours() * 60 +
      ahora.getMinutes();

    const minutosDeLaReserva =
      horaReserva * 60 +
      minutoReserva;

    return minutosDeLaReserva <= minutosActuales;
  };

  // ==========================================
  // CARGAR RESERVAS DEL DÍA
  // ==========================================

  useEffect(() => {
    async function cargarReservasDelDia() {
      if (!reserva.dia || !tallerId) {
        setReservasPorHora({});
        setTotalReservasDia(0);
        return;
      }

      setCargandoHoras(true);

      // Solo recuentos por hora: la ocupación del taller es pública, los datos de las
      // reservas no. La RPC los agrega en la base de datos.
      const { data, error } = await supabasePublic.rpc(
        "ocupacion_dia",
        {
          p_taller_id: tallerId,
          p_dia: reserva.dia,
        }
      );

      if (error) {
        console.error(
          "Error cargando la ocupación del día:",
          error
        );

        setReservasPorHora({});
        setTotalReservasDia(0);
      } else {
        const contador = {};
        let total = 0;

        (data || []).forEach((item) => {
          const hora =
            item.hora?.substring(0, 5);

          if (!hora) return;

          const cuantas = Number(item.total) || 0;

          contador[hora] =
            (contador[hora] || 0) + cuantas;
          total += cuantas;
        });

        setReservasPorHora(contador);
        setTotalReservasDia(total);
      }

      setCargandoHoras(false);
    }

    cargarReservasDelDia();
  }, [reserva.dia, tallerId]);

  // ==========================================
  // CAMBIAR FECHA
  // ==========================================

  const cambiarFecha = (fecha) => {
    if (!fecha) return;

    // Seguridad: no permitir fines de semana
    if (
      fecha.getDay() === 0 ||
      fecha.getDay() === 6
    ) {
      return;
    }

    // Seguridad: no permitir festivos
    if (obtenerFestivo(fecha)) {
      return;
    }

    const valor = formatearFecha(fecha);

    if (reserva.dia === valor) {
      setReserva({
        ...reserva,
        dia: "",
        hora: "",
      });

      return;
    }

    setReserva({
      ...reserva,
      dia: valor,
      hora: "",
    });
  };

  // ==========================================
  // HORAS DISPONIBLES
  // ==========================================

  const horasDisponibles = horariosTaller
    .filter((horario) => {
      if (!reserva.dia) {
        return false;
      }

      const fecha = new Date(
        reserva.dia + "T00:00:00"
      );

      const diaSemana = fecha.getDay();

      return (
        Number(horario.dia_semana) ===
        diaSemana
      );
    })
    .map((horario) => ({
      hora: horario.hora.substring(0, 5),
      aviso_tarde: horario.aviso_tarde,
    }))
    .filter((slot) => {
      const reservasActuales =
        reservasPorHora[slot.hora] || 0;

      const completa =
        Number(tallerId) === 1
          ? totalReservasDia >= capacidad
          : reservasActuales >= capacidad;

      return (
        !completa &&
        !horaYaPasada(slot.hora)
      );
    });

  // ==========================================
  // LIMPIAR HORA SI DEJA DE ESTAR DISPONIBLE
  // ==========================================

  useEffect(() => {
    if (!reserva.hora) return;

    const reservasActuales =
      reservasPorHora[reserva.hora] || 0;

    const completa =
      Number(tallerId) === 1
        ? totalReservasDia >= capacidad
        : reservasActuales >= capacidad;

    if (
      horaYaPasada(reserva.hora) ||
      completa
    ) {
      setReserva({
        ...reserva,
        hora: "",
      });
    }
  }, [
    ahora,
    reservasPorHora,
    capacidad,
    totalReservasDia,
  ]);

  // ==========================================
  // SELECCIONAR HORA
  // ==========================================

  const seleccionarHora = (hora) => {
    if (horaYaPasada(hora)) {
      return;
    }

    const reservasActuales =
      reservasPorHora[hora] || 0;

    const completa =
      Number(tallerId) === 1
        ? totalReservasDia >= capacidad
        : reservasActuales >= capacidad;

    if (completa) {
      return;
    }

    if (reserva.hora === hora) {
      setReserva({
        ...reserva,
        hora: "",
      });

      return;
    }

    setReserva({
      ...reserva,
      hora,
    });
  };

  // ==========================================
  // COMPROBAR SI EL TALLER ABRE ESE DÍA
  // ==========================================

  const tallerAbreEseDia = (date) => {
    const diaSemana = date.getDay();

    return horariosTaller.some(
      (horario) =>
        Number(horario.dia_semana) ===
        diaSemana
    );
  };

  // ==========================================
  // AVISO DE ÚLTIMA HORA
  // ==========================================

  const mostrarAvisoTarde =
    reserva.hora &&
    horasDisponibles.some(
      (slot) =>
        slot.hora === reserva.hora &&
        slot.aviso_tarde === true
    );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="card card-fecha">

      <div className="volver-card">
        <button
          type="button"
          className="volver-menu"
          onClick={volver}
        >
          ← Volver
        </button>
      </div>

      <h1>
        Elige fecha y hora
      </h1>

      <Calendar
        locale="es-ES"
        onChange={cambiarFecha}
        value={
          reserva.dia
            ? new Date(
                reserva.dia + "T00:00:00"
              )
            : null
        }
        minDate={new Date()}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}

        // ======================================
        // BLOQUEAR DÍAS
        // ======================================

        tileDisabled={({ date, view }) => {
          if (view !== "month") {
            return false;
          }

          // Sábado o domingo
          if (
            date.getDay() === 0 ||
            date.getDay() === 6
          ) {
            return true;
          }

          // Festivo
          if (obtenerFestivo(date)) {
            return true;
          }

          // Mientras carga horarios
          if (cargandoHorarios) {
            return true;
          }

          // Día sin horario para ese taller
          return !tallerAbreEseDia(date);
        }}

        // ======================================
        // MARCAR FESTIVOS
        // ======================================

        tileContent={({ date, view }) => {
          if (view !== "month") {
            return null;
          }

          const festivo =
            obtenerFestivo(date);

          if (!festivo) {
            return null;
          }

          return (
            <div
              title={festivo.nombre}
              style={{
                fontSize: "9px",
                lineHeight: "10px",
                marginTop: "2px",
                color: "#dc2626",
                fontWeight: "700",
              }}
            >
              FESTIVO
            </div>
          );
        }}
      />

      {reserva.dia && (
        <>
          <h3 className="titulo-horas">
            Horas disponibles
          </h3>

          {cargandoHorarios ||
          cargandoHoras ? (

            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                margin: "20px 0",
              }}
            >
              Comprobando disponibilidad...
            </p>

          ) : horasDisponibles.length > 0 ? (

            <>
              <div className="horas-grid">

                {horasDisponibles.map(
                  (slot) => (
                    <button
                      key={slot.hora}
                      type="button"
                      className={
                        reserva.hora === slot.hora
                          ? "hora seleccionada"
                          : "hora"
                      }
                      onClick={() =>
                        seleccionarHora(slot.hora)
                      }
                    >
                      {slot.hora}
                    </button>
                  )
                )}

              </div>

              {mostrarAvisoTarde && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#b45309",
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: "10px",
                    padding: "12px",
                    marginTop: "16px",
                    fontWeight: "600",
                  }}
                >
                  ⚠️ Al seleccionar esta última hora de
                  recepción, el vehículo podría quedar en
                  el taller y entregarse al día siguiente.
                </p>
              )}
            </>

          ) : (

            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                margin: "20px 0",
              }}
            >
              No hay horas disponibles para este día.
            </p>

          )}
        </>
      )}

      <button
        type="button"
        disabled={!reserva.hora}
        onClick={continuar}
      >
        CONTINUAR
      </button>

    </div>
  );
}