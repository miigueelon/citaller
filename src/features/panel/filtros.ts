// Filtros y agrupaciones del panel. Lógica pura, sin React: se prueba sola.
import { esDiaPasado, esFinDeSemana, formatearDiaLargo, hoy, sumarDias, type Dia } from "@/lib/fechas";
import type { EstadoReserva, FiltroFecha, ReservaPanel } from "./tipos";

/**
 * Reservas de hoy en adelante. (Regla heredada: también se ocultan las de fin de semana;
 * la fase 2.5 la retira porque esconde citas futuras de sábado o domingo.)
 */
export function reservasFuturas(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas.filter((reserva) => !!reserva.dia && !esDiaPasado(reserva.dia, ahora) && !esFinDeSemana(reserva.dia));
}

export function porEstado(reservas: ReservaPanel[], estado: EstadoReserva): ReservaPanel[] {
  return reservas.filter((reserva) => reserva.estado === estado);
}

/** Total histórico de reservas válidas: todas menos las canceladas. */
export function totalValidas(reservas: ReservaPanel[]): number {
  return reservas.filter((reserva) => reserva.estado !== "Cancelada").length;
}

/** Reservas anteriores a hoy, de la más reciente a la más antigua. */
export function historial(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas
    .filter((reserva) => !!reserva.dia && esDiaPasado(reserva.dia, ahora))
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
