import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useTaller } from "@/app/providers/useTaller";
import { formatearDia, formatearDiaLargo, hoy, parsearDia, sumarDias } from "@/lib/fechas";
import { diaSeleccionable, festivoDelDia, horaSigueDisponible, horasDisponibles, type ParametrosDisponibilidad } from "../disponibilidad";
import { useAntelacion } from "../useAntelacion";
import { useDisponibilidad } from "../useDisponibilidad";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  actualizar: (cambios: Partial<ReservaEnCurso>) => void;
  volver: () => void;
  continuar: () => void;
}

const AVISO_TARDE_POR_DEFECTO = "⚠️ Al seleccionar esta última hora de recepción, el vehículo podría quedar en el taller y entregarse al día siguiente.";
const ANTELACION_POR_DEFECTO = "Este servicio necesita algo más de antelación.";

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

  // Servicios con antelación (Neumáticos en Rik and Roll): la primera hora posible la dice la base de datos.
  const servicio = taller.servicios.find((s) => s.nombre === reserva.servicio);
  const { minimo, cargandoMinimo } = useAntelacion(taller.id, servicio?.id ?? null, (servicio?.bloques_antelacion ?? 0) > 0, ahora);

  const parametros: ParametrosDisponibilidad | null = useMemo(
    () =>
      reserva.dia
        ? { horarios, dia: reserva.dia, ocupacion, capacidad: taller.capacidad, modo: taller.modo_capacidad, maxDia: taller.max_citas_dia, minimo, ahora }
        : null,
    [horarios, reserva.dia, ocupacion, taller.capacidad, taller.modo_capacidad, taller.max_citas_dia, minimo, ahora],
  );

  const horas = useMemo(() => (parametros ? horasDisponibles(parametros) : []), [parametros]);

  // Si la hora elegida deja de estar disponible (se llena, pasa o queda antes de la antelación), se
  // suelta. Mientras cargan los horarios o la antelación no se decide nada: al volver desde el
  // resumen, la hora elegida se conserva.
  useEffect(() => {
    if (!reserva.hora || !parametros || cargandoHorarios || cargandoMinimo) return;
    if (!horaSigueDisponible(reserva.hora, parametros)) actualizar({ hora: "" });
  }, [reserva.hora, parametros, cargandoHorarios, cargandoMinimo, actualizar]);

  // Si el día elegido queda antes de la primera hora posible (la antelación cambió después de elegirlo), se suelta.
  useEffect(() => {
    if (!reserva.dia || cargandoHorarios || cargandoMinimo) return;
    if (!diaSeleccionable(horarios, festivos, reserva.dia, minimo)) actualizar({ dia: "", hora: "" });
  }, [reserva.dia, horarios, festivos, minimo, cargandoHorarios, cargandoMinimo, actualizar]);

  function cambiarFecha(valor: unknown) {
    if (!(valor instanceof Date)) return;
    const dia = formatearDia(valor);
    if (!diaSeleccionable(horarios, festivos, dia, minimo)) return;
    // Volver a pulsar el día elegido lo deselecciona.
    actualizar(reserva.dia === dia ? { dia: "", hora: "" } : { dia, hora: "" });
  }

  function seleccionarHora(hora: string) {
    if (!horas.some((franja) => franja.hora === hora)) return;
    actualizar({ hora: reserva.hora === hora ? "" : hora });
  }

  const mostrarAvisoTarde = reserva.hora !== "" && horas.some((franja) => franja.hora === reserva.hora && franja.aviso_tarde);
  const diaHoy = hoy(ahora);
  const cargandoCalendario = cargandoHorarios || cargandoMinimo;

  return (
    <div className="card card-fecha">
      <div className="volver-card">
        <button type="button" className="volver-menu" onClick={volver}>
          ← Volver
        </button>
      </div>

      <h1>Elige fecha y hora</h1>

      {servicio && minimo && (
        <p className="aviso-antelacion" role="status">
          {servicio.antelacion_texto ?? ANTELACION_POR_DEFECTO} Primera hora disponible:{" "}
          <strong>
            {formatearDiaLargo(minimo.dia)} a las {minimo.hora}
          </strong>
          .
        </p>
      )}

      <Calendar
        locale="es-ES"
        onChange={cambiarFecha}
        value={reserva.dia ? parsearDia(reserva.dia) : null}
        minDate={parsearDia(minimo && minimo.dia > diaHoy ? minimo.dia : diaHoy)}
        // La base de datos admite citas hasta 90 días vista (CT004): el calendario no ofrece más.
        maxDate={parsearDia(sumarDias(diaHoy, 90))}
        prev2Label={null}
        next2Label={null}
        showNeighboringMonth={false}
        tileDisabled={({ date, view }) => {
          if (view !== "month") return false;
          if (cargandoCalendario) return true;
          return !diaSeleccionable(horarios, festivos, formatearDia(date), minimo);
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

      {cargandoMinimo && <p className="mensaje-disponibilidad">Comprobando disponibilidad...</p>}

      {reserva.dia && (
        <>
          <h3 className="titulo-horas">Horas disponibles</h3>

          {cargandoCalendario || cargandoOcupacion ? (
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
