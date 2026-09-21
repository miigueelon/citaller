// Filtros y agrupaciones del panel. Lógica pura, sin React: se prueba sola.
import { esDiaPasado, formatearDia, formatearDiaCorto, formatearDiaLargo, horaDeInstante, hoy, sumarDias, type Dia } from "@/lib/fechas";
import type { EstadoReserva, FiltroEstado, FiltroFecha, ReservaPanel, TipoAviso } from "./tipos";

/** Reservas de hoy en adelante, cualquier día de la semana. */
export function reservasFuturas(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas.filter((reserva) => !!reserva.dia && !esDiaPasado(reserva.dia, ahora));
}

export function porEstado(reservas: ReservaPanel[], estado: EstadoReserva): ReservaPanel[] {
  return reservas.filter((reserva) => reserva.estado === estado);
}

/** Lo que dice la cabecera del panel: "Hoy: 2 por terminar · 1 por responder". */
export interface ResumenCabecera {
  /** Citas confirmadas de hoy (de la web y apuntadas a mano) sin el vehículo listo. */
  porTerminar: number;
  /** Citas confirmadas de hoy ya marcadas con "Vehículo listo". */
  terminadas: number;
  /** Solicitudes pendientes de hoy en adelante. */
  porResponder: number;
}

export function resumenCabecera(reservas: ReservaPanel[], ahora: Date = new Date()): ResumenCabecera {
  const diaHoy = hoy(ahora);
  const deHoy = reservas.filter((reserva) => reserva.dia === diaHoy && reserva.estado === "Confirmada");
  const terminadas = deHoy.filter((reserva) => reserva.listo_en !== null).length;
  return {
    porTerminar: deHoy.length - terminadas,
    terminadas,
    porResponder: reservasFuturas(reservas, ahora).filter((reserva) => reserva.estado === "Pendiente").length,
  };
}

/**
 * "Hoy: 2 por terminar · 1 por responder", "Hoy: todo terminado · todo al día", "Hoy: sin citas · …".
 * Una cita con el vehículo listo deja de contar (decisión de Miguel, 22-sep-2026).
 */
export function textoResumen({ porTerminar, terminadas, porResponder }: ResumenCabecera): string {
  const citas = porTerminar > 0 ? `Hoy: ${porTerminar} por terminar` : terminadas > 0 ? "Hoy: todo terminado" : "Hoy: sin citas";
  return `${citas} · ${porResponder === 0 ? "todo al día" : `${porResponder} por responder`}`;
}

/** "a las 12:30" si fue hoy; "el 21/09 a las 12:30" si fue otro día. */
export function cuandoFue(instante: string, ahora: Date = new Date()): string {
  const fecha = new Date(instante);
  const dia = formatearDia(fecha);
  return `${dia === hoy(ahora) ? "" : `el ${formatearDiaCorto(dia).slice(0, 5)} `}a las ${horaDeInstante(fecha)}`;
}

/** Marca de la cita terminada: "✓ Lista · avisado a las 12:30" ("✓ Lista a las 12:30" sin WhatsApp). */
export function textoLista(listoEn: string, avisado: boolean, ahora: Date = new Date()): string {
  return `✓ Lista${avisado ? " · avisado" : ""} ${cuandoFue(listoEn, ahora)}`;
}

const AVISO_HECHO: Record<TipoAviso, string> = {
  confirmacion: "✓ Confirmación avisada",
  cancelacion: "✓ Cancelación avisada",
  recordatorio: "✓ Recordatorio enviado",
};

function estadoAviso(reserva: ReservaPanel, tipo: TipoAviso): [enviado: boolean, fecha: string | null] {
  if (tipo === "confirmacion") return [reserva.whatsapp_confirmacion_enviada, reserva.whatsapp_confirmacion_fecha];
  if (tipo === "cancelacion") return [reserva.whatsapp_cancelacion_enviada, reserva.whatsapp_cancelacion_fecha];
  return [reserva.whatsapp_recordatorio_enviado, reserva.whatsapp_recordatorio_fecha];
}

/** "✓ Confirmación avisada a las 12:30" si ese aviso ya se mandó; null si no. */
export function marcaAviso(reserva: ReservaPanel, tipo: TipoAviso, ahora: Date = new Date()): string | null {
  const [enviado, fecha] = estadoAviso(reserva, tipo);
  if (!enviado) return null;
  return fecha ? `${AVISO_HECHO[tipo]} ${cuandoFue(fecha, ahora)}` : AVISO_HECHO[tipo];
}

/** La reserva con el aviso apuntado (lo que acaba de guardar marcar_aviso_whatsapp). */
export function conAviso(reserva: ReservaPanel, tipo: TipoAviso, fecha: string): ReservaPanel {
  if (tipo === "confirmacion") return { ...reserva, whatsapp_confirmacion_enviada: true, whatsapp_confirmacion_fecha: fecha };
  if (tipo === "cancelacion") return { ...reserva, whatsapp_cancelacion_enviada: true, whatsapp_cancelacion_fecha: fecha };
  return { ...reserva, whatsapp_recordatorio_enviado: true, whatsapp_recordatorio_fecha: fecha };
}

/**
 * Cita hecha: confirmada y con "Vehículo listo" pulsado, o confirmada de un día ya pasado (aunque
 * nadie pulsara el botón). Las canceladas y las que nadie respondió no cuentan (decisiones de Miguel,
 * 21 y 22-sep-2026).
 */
export function estaFinalizada(reserva: ReservaPanel, ahora: Date = new Date()): boolean {
  return reserva.estado === "Confirmada" && (reserva.listo_en !== null || (!!reserva.dia && esDiaPasado(reserva.dia, ahora)));
}

/** Pestaña "Finalizadas": el registro histórico de todas las citas hechas, de la más reciente a la más antigua. */
export function finalizadas(reservas: ReservaPanel[], ahora: Date = new Date()): ReservaPanel[] {
  return reservas.filter((reserva) => estaFinalizada(reserva, ahora)).sort((a, b) => `${b.dia} ${b.hora ?? ""}`.localeCompare(`${a.dia} ${a.hora ?? ""}`));
}

/** Lo que enseña cada pestaña. Confirmadas son las que faltan por hacer; las hechas pasan a Finalizadas. */
export function porPestana(reservas: ReservaPanel[], filtro: FiltroEstado, ahora: Date = new Date()): ReservaPanel[] {
  if (filtro === "Finalizada") return finalizadas(reservas, ahora);
  const futuras = porEstado(reservasFuturas(reservas, ahora), filtro);
  return filtro === "Confirmada" ? futuras.filter((reserva) => reserva.listo_en === null) : futuras;
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

/** "lunes, 21 de septiembre de 2026", para las finalizadas (pueden ser de otro año). */
export function tituloHistorial(dia: Dia): string {
  return formatearDiaLargo(dia, { conAnio: true });
}
