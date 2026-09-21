// Filtros y agrupaciones del panel. Lógica pura, sin React: se prueba sola.
import { esDiaPasado, formatearDiaLargo, hoy, sumarDias, type Dia } from "@/lib/fechas";
import type { EstadoReserva, FiltroFecha, ReservaPanel } from "./tipos";

/** Reservas de hoy en adelante, cualquier día de la semana. */
export function reservasFuturas(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas.filter((reserva) => !!reserva.dia && !esDiaPasado(reserva.dia, ahora));
}

export function porEstado(reservas: ReservaPanel[], estado: EstadoReserva): ReservaPanel[] {
  return reservas.filter((reserva) => reserva.estado === estado);
}

/** Lo que dice la cabecera del panel: "Hoy: 3 citas · 2 por responder". */
export interface ResumenCabecera {
  /** Citas confirmadas para hoy (de la web y apuntadas a mano). */
  citasHoy: number;
  /** Solicitudes pendientes de hoy en adelante. */
  porResponder: number;
}

export function resumenCabecera(reservas: ReservaPanel[], ahora: Date = new Date()): ResumenCabecera {
  const diaHoy = hoy(ahora);
  return {
    citasHoy: reservas.filter((reserva) => reserva.dia === diaHoy && reserva.estado === "Confirmada").length,
    porResponder: reservasFuturas(reservas, ahora).filter((reserva) => reserva.estado === "Pendiente").length,
  };
}

/** "Hoy: 3 citas · 2 por responder", "Hoy: 1 cita · todo al día", "Hoy: sin citas · 1 por responder". */
export function textoResumen({ citasHoy, porResponder }: ResumenCabecera): string {
  const citas = citasHoy === 0 ? "Hoy: sin citas" : `Hoy: ${citasHoy} ${citasHoy === 1 ? "cita" : "citas"}`;
  return `${citas} · ${porResponder === 0 ? "todo al día" : `${porResponder} por responder`}`;
}

/**
 * Historial: las citas confirmadas de días anteriores a hoy (de la web y apuntadas a mano), de la más
 * reciente a la más antigua. Las canceladas y las que nadie respondió no cuentan (decisión de Miguel,
 * 21-sep-2026).
 */
export function historial(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas
    .filter((reserva) => !!reserva.dia && esDiaPasado(reserva.dia, ahora) && reserva.estado === "Confirmada")
    .sort((a, b) => `${b.dia} ${b.hora ?? ""}`.localeCompare(`${a.dia} ${a.hora ?? ""}`));
}

export interface CriteriosFiltro {
  busqueda: string;
  filtroFecha: FiltroFecha;
}

/** Filtro de texto (nombre, matrícula, vehículo) y de fecha rápida (hoy, mañana, próximos 7 días). */
export function filtrarReservas(reservas: ReservaPanel[], { busqueda, filtroFecha }: CriteriosFiltro, ahora: Date = new Date()): ReservaPanel[] {
  const texto = busqueda.trim().toLowerCase();
  const diaHoy = hoy(ahora);
  const diaManana = sumarDias(diaHoy, 1);
  const diaLimite = sumarDias(diaHoy, 7);

  return reservas.filter((reserva) => {
    const coincideBusqueda =
      !texto ||
      (reserva.nombre ?? "").toLowerCase().includes(texto) ||
      (reserva.matricula ?? "").toLowerCase().includes(texto) ||
      (reserva.vehiculo ?? "").toLowerCase().includes(texto);

    let coincideFecha = true;
    if (filtroFecha === "hoy") coincideFecha = reserva.dia === diaHoy;
    else if (filtroFecha === "manana") coincideFecha = reserva.dia === diaManana;
    else if (filtroFecha === "7dias") coincideFecha = reserva.dia >= diaHoy && reserva.dia < diaLimite;

    return coincideBusqueda && coincideFecha;
  });
}

/** Agrupa por día conservando el orden de llegada (las reservas ya vienen ordenadas por día y hora). */
export function agruparPorDia(reservas: ReservaPanel[]): Array<[Dia, ReservaPanel[]]> {
  const grupos = new Map<Dia, ReservaPanel[]>();
  for (const reserva of reservas) {
    const grupo = grupos.get(reserva.dia);
    if (grupo) grupo.push(reserva);
    else grupos.set(reserva.dia, [reserva]);
  }
  return [...grupos.entries()];
}

/** "HOY", "MAÑANA" o "lunes, 21 de septiembre". */
export function tituloGrupo(dia: Dia, ahora: Date = new Date()): string {
  const diaHoy = hoy(ahora);
  if (dia === diaHoy) return "HOY";
  if (dia === sumarDias(diaHoy, 1)) return "MAÑANA";
  return formatearDiaLargo(dia);
}

/** "lunes, 21 de septiembre de 2026", para el historial. */
export function tituloHistorial(dia: Dia): string {
  return formatearDiaLargo(dia, { conAnio: true });
}
