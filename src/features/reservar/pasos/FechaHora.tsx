import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useTaller } from "@/app/providers/useTaller";
import { formatearDia, parsearDia } from "@/lib/fechas";
import { diaSeleccionable, festivoDelDia, horaSigueDisponible, horasDisponibles, type ParametrosDisponibilidad } from "../disponibilidad";
import { useDisponibilidad } from "../useDisponibilidad";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  actualizar: (cambios: Partial<ReservaEnCurso>) => void;
  volver: () => void;
  continuar: () => void;
}

const AVISO_TARDE_POR_DEFECTO = "⚠️ Al seleccionar esta última hora de recepción, el vehículo podría quedar en el taller y entregarse al día siguiente.";

/** Paso 2: calendario del taller y horas libres del día elegido, según su modo de capacidad. */
export function FechaHora({ reserva, actualizar, volver, continuar }: Props) {
  const taller = useTaller();
  const { horarios, festivos, ocupacion, cargandoHorarios, cargandoOcupacion } = useDisponibilidad(taller.id, reserva.dia);

  // La hora actual se refresca cada 30 s para ir quitando las horas que van pasando.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const parametros: ParametrosDisponibilidad | null = useMemo(
    () =>
      reserva.dia
        ? { horarios, dia: reserva.dia, ocupacion, capacidad: taller.capacidad, modo: taller.modo_capacidad, maxDia: taller.max_citas_dia, ahora }
        : null,
    [horarios, reserva.dia, ocupacion, taller.capacidad, taller.modo_capacidad, taller.max_citas_dia, ahora],
  );

  const horas = useMemo(() => (parametros ? horasDisponibles(parametros) : []), [parametros]);

  // Si la hora elegida deja de estar disponible (se llena o pasa), se suelta.
  useEffect(() => {
    if (!reserva.hora || !parametros) return;
    if (!horaSigueDisponible(reserva.hora, parametros)) actualizar({ hora: "" });
  }, [reserva.hora, parametros, actualizar]);

  function cambiarFecha(valor: unknown) {
    if (!(valor instanceof Date)) return;
    const dia = formatearDia(valor);
    if (!diaSeleccionable(horarios, festivos, dia)) return;
    // Volver a pulsar el día elegido lo deselecciona.
    actualizar(reserva.dia === dia ? { dia: "", hora: "" } : { dia, hora: "" });
  }

  function seleccionarHora(hora: string) {
    if (!horas.some((franja) => franja.hora === hora)) return;
    actualizar({ hora: reserva.hora === hora ? "" : hora });
  }

  const mostrarAvisoTarde = reserva.hora !== "" && horas.some((franja) => franja.hora === reserva.hora && franja.aviso_tarde);

  return (
    <div className="card card-fecha">
      <div className="volver-card">
        <button type="button" className="volver-menu" onClick={volver}>
          ← Volver
        </button>
      </div>

      <h1>Elige fecha y hora</h1>

      <Calendar
        locale="es-ES"
        onChange={cambiarFecha}
        value={reserva.dia ? parsearDia(reserva.dia) : null}
        minDate={new Date()}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
        tileDisabled={({ date, view }) => {
          if (view !== "month") return false;
          if (cargandoHorarios) return true;
          return !diaSeleccionable(horarios, festivos, formatearDia(date));
        }}
        tileContent={({ date, view }) => {
          if (view !== "month") return null;
          const festivo = festivoDelDia(festivos, formatearDia(date));
          if (!festivo) return null;
          return (
            <div title={festivo.nombre} className="festivo-etiqueta">
              FESTIVO
            </div>
          );
        }}
      />

      {reserva.dia && (
        <>
          <h3 className="titulo-horas">Horas disponibles</h3>

          {cargandoHorarios || cargandoOcupacion ? (
            <p className="mensaje-disponibilidad">Comprobando disponibilidad...</p>
          ) : horas.length > 0 ? (
            <>
              <div className="horas-grid">
                {horas.map((franja) => (
                  <button
                    key={franja.hora}
                    type="button"
                    className={reserva.hora === franja.hora ? "hora seleccionada" : "hora"}
                    onClick={() => seleccionarHora(franja.hora)}
                  >
                    {franja.hora}
                  </button>
                ))}
              </div>

              {mostrarAvisoTarde && <p className="aviso-tarde">{taller.texto_aviso_tarde ?? AVISO_TARDE_POR_DEFECTO}</p>}
            </>
          ) : (
            <p className="mensaje-disponibilidad">No hay horas disponibles para este día.</p>
          )}
        </>
      )}

      <button type="button" className="boton-principal" disabled={!reserva.hora} onClick={continuar}>
        CONTINUAR
      </button>
    </div>
  );
}
