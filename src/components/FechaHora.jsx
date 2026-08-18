import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "../lib/supabaseClient";

export default function FechaHora({
  reserva,
  setReserva,
  volver,
  continuar,
}) {

  // ==========================================
  // HORAS OCUPADAS DESDE SUPABASE
  // ==========================================

  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  // ==========================================
  // HORA ACTUAL
  // ==========================================

  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {

    const intervalo = setInterval(() => {
      setAhora(new Date());
    }, 30000);

    return () => clearInterval(intervalo);

  }, []);

  // ==========================================
  // HORARIO DEL TALLER
  // ==========================================

  const horas = useMemo(() => {
    return [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",

      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
    ];
  }, []);

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
  // COMPROBAR SI UNA HORA YA HA PASADO HOY
  // ==========================================

  const horaYaPasada = (hora) => {

    if (!reserva.dia) {
      return false;
    }

    const hoy = formatearFecha(ahora);

    // Si no es hoy, la hora no está pasada
    if (reserva.dia !== hoy) {
      return false;
    }

    const [horaReserva, minutosReserva] =
      hora.split(":").map(Number);

    const minutosActuales =
      ahora.getHours() * 60 +
      ahora.getMinutes();

    const minutosDeLaReserva =
      horaReserva * 60 +
      minutosReserva;

    return minutosDeLaReserva <= minutosActuales;
  };

  // ==========================================
  // CARGAR HORAS OCUPADAS
  // ==========================================

  useEffect(() => {

    async function cargarHorasOcupadas() {

      if (!reserva.dia) {

        setHorasOcupadas([]);

        return;
      }

      setCargandoHoras(true);

      const { data, error } = await supabase
        .from("reservas")
        .select("hora, estado")
        .eq("dia", reserva.dia)
        .in("estado", [
          "Pendiente",
          "Confirmada",
        ]);

      if (error) {

        console.error(
          "Error cargando horas ocupadas:",
          error
        );

        setHorasOcupadas([]);

      } else {

        const horas = (data || [])
          .map((reserva) =>
            reserva.hora?.substring(0, 5)
          )
          .filter(Boolean);

        setHorasOcupadas(horas);
      }

      setCargandoHoras(false);
    }

    cargarHorasOcupadas();

  }, [reserva.dia]);

  // ==========================================
  // CAMBIAR FECHA
  // ==========================================

  const cambiarFecha = (fecha) => {

    if (!fecha) return;

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

  const horasDisponibles = horas.filter(
    (hora) =>
      !horasOcupadas.includes(hora) &&
      !horaYaPasada(hora)
  );

  // ==========================================
  // LIMPIAR HORA SI PASA MIENTRAS ESTÁ SELECCIONADA
  // ==========================================

  useEffect(() => {

    if (
      reserva.hora &&
      horaYaPasada(reserva.hora)
    ) {

      setReserva({
        ...reserva,
        hora: "",
      });

    }

  }, [ahora]);

  // ==========================================
  // SELECCIONAR HORA
  // ==========================================

  const seleccionarHora = (hora) => {

    // Seguridad adicional:
    // no permitir seleccionar una hora pasada

    if (horaYaPasada(hora)) {
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
  // RENDER
  // ==========================================

  return (

    <div className="card card-fecha">

      {/* VOLVER */}

      <div className="volver-card">

        <button
          type="button"
          className="volver-menu"
          onClick={volver}
        >
          ← Volver
        </button>

      </div>

      {/* TÍTULO */}

      <h1>
        Elige fecha y hora
      </h1>

      {/* CALENDARIO */}

      <Calendar
        locale="es-ES"
        onChange={cambiarFecha}
        value={
          reserva.dia
            ? new Date(reserva.dia)
            : null
        }
        minDate={new Date()}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}

        tileDisabled={({
          date,
          view
        }) => {

          if (view === "month") {

            return (
              date.getDay() === 0 ||
              date.getDay() === 6
            );

          }

          return false;
        }}
      />

      {/* HORAS */}

      {reserva.dia && (

        <>

          <h3 className="titulo-horas">
            Horas disponibles
          </h3>

          {cargandoHoras ? (

            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                margin: "20px 0",
              }}
            >
              Comprobando disponibilidad...
            </p>

          ) : (

            <div className="horas-grid">

              {horasDisponibles.map(
                (hora) => (

                  <button
                    key={hora}
                    type="button"
                    className={
                      reserva.hora === hora
                        ? "hora seleccionada"
                        : "hora"
                    }
                    onClick={() =>
                      seleccionarHora(hora)
                    }
                  >
                    {hora}
                  </button>

                )
              )}

            </div>

          )}

        </>

      )}

      {/* CONTINUAR */}

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