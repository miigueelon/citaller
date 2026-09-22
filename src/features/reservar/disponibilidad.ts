// Lógica pura de disponibilidad de la pantalla de fecha y hora. Sin React ni red: se prueba sola.
import { diaSemana, esHoraPasada, horaCorta, minutosDelDia, type Dia, type Hora } from "@/lib/fechas";

export interface Horario {
  /** 0 = domingo … 6 = sábado (como `Date.getDay()`). */
  dia_semana: number;
  /** "HH:MM" o "HH:MM:SS". */
  hora: Hora;
  aviso_tarde: boolean;
}

export interface Festivo {
  fecha: Dia;
  nombre: string;
}

/** Reservas activas por hora ("HH:MM" → cuántas) y en total en el día. */
export interface Ocupacion {
  porHora: Record<string, number>;
  total: number;
}

/** `por_hora`: la capacidad limita cada hora. `por_dia`: limita el total del día. */
export type ModoCapacidad = "por_hora" | "por_dia";

export interface HoraDisponible {
  hora: string;
  aviso_tarde: boolean;
}

export const OCUPACION_VACIA: Ocupacion = { porHora: {}, total: 0 };

/** Convierte las filas de la RPC `ocupacion_dia` en un mapa por hora corta. */
export function agruparOcupacion(filas: Array<{ hora: string | null; total: number | null }>): Ocupacion {
  const porHora: Record<string, number> = {};
  let total = 0;
  for (const fila of filas) {
    if (!fila.hora) continue;
    const hora = horaCorta(fila.hora);
    const cuantas = Number(fila.total) || 0;
    porHora[hora] = (porHora[hora] ?? 0) + cuantas;
    total += cuantas;
  }
  return { porHora, total };
}

/**
 * Primera hora que se puede reservar para un servicio con antelación (`servicios_taller.bloques_antelacion`),
 * en hora del taller. La calcula la base de datos (RPC `antelacion_minima`): el mismo criterio que
 * aplica `validar_datos_reserva` (CT021) al guardar.
 */
export interface MinimoReserva {
  dia: Dia;
  /** "HH:MM". */
  hora: string;
}

/** "2026-09-24T15:30:00" (timestamp sin zona, hora del taller) → `{ dia, hora }`. Sin `new Date`. */
export function parsearMinimo(valor: string | null | undefined): MinimoReserva | null {
  if (!valor) return null;
  const partes = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(valor);
  return partes ? { dia: partes[1], hora: partes[2] } : null;
}

/** ¿(día, hora) queda antes de la primera hora posible del servicio? Sin mínimo, nunca. */
export function esAntesDelMinimo(dia: Dia, hora: Hora, minimo: MinimoReserva | null | undefined): boolean {
  if (!minimo) return false;
  if (dia !== minimo.dia) return dia < minimo.dia;
  return minutosDelDia(hora) < minutosDelDia(minimo.hora);
}

export function festivoDelDia(festivos: Festivo[], dia: Dia): Festivo | undefined {
  return festivos.find((festivo) => festivo.fecha === dia);
}

/** ¿El taller tiene alguna hora ese día de la semana? */
export function tallerAbre(horarios: Horario[], dia: Dia): boolean {
  const dow = diaSemana(dia);
  return horarios.some((horario) => Number(horario.dia_semana) === dow);
}

/**
 * ¿Se puede elegir ese día en el calendario? Ni festivo, con horario ese día de la semana y, si el
 * servicio tiene antelación, no antes del día de su primera hora posible.
 * El mismo criterio que `validar_datos_reserva` en la base de datos: manda `horarios_taller` (un
 * taller que abra los sábados solo tiene que tener horas del sábado).
 */
export function diaSeleccionable(horarios: Horario[], festivos: Festivo[], dia: Dia, minimo: MinimoReserva | null = null): boolean {
  return !festivoDelDia(festivos, dia) && tallerAbre(horarios, dia) && !(minimo !== null && dia < minimo.dia);
}

/**
 * ¿Por qué está llena una hora? `"dia"` si el día ya no admite más citas (por el modo `por_dia` o por
 * el tope diario `maxDia`), `"hora"` si esa franja está llena, `null` si queda sitio.
 * El mismo criterio que el trigger `comprobar_capacidad` de la base de datos.
 */
export function motivoCompleta(
  ocupacion: Ocupacion,
  hora: string,
  capacidad: number,
  modo: ModoCapacidad,
  maxDia: number | null = null,
): "dia" | "hora" | null {
  if (maxDia !== null && ocupacion.total >= maxDia) return "dia";
  if (modo === "por_dia") return ocupacion.total >= capacidad ? "dia" : null;
  return (ocupacion.porHora[hora] ?? 0) >= capacidad ? "hora" : null;
}

/** ¿La hora está llena según la capacidad, el modo y el tope diario del taller? */
export function estaCompleta(ocupacion: Ocupacion, hora: string, capacidad: number, modo: ModoCapacidad, maxDia: number | null = null): boolean {
  return motivoCompleta(ocupacion, hora, capacidad, modo, maxDia) !== null;
}

export interface ParametrosDisponibilidad {
  horarios: Horario[];
  dia: Dia;
  ocupacion: Ocupacion;
  capacidad: number;
  modo: ModoCapacidad;
  /** Tope de citas en todo el día además del modo; null = sin tope. */
  maxDia?: number | null;
  /** Primera hora posible del servicio elegido (antelación); null = sin antelación. */
  minimo?: MinimoReserva | null;
  ahora: Date;
}

/**
 * Horas del día que se pueden reservar: las del horario, que no estén llenas, no hayan pasado ni
 * queden antes de la primera hora posible del servicio.
 */
export function horasDisponibles({ horarios, dia, ocupacion, capacidad, modo, maxDia = null, minimo = null, ahora }: ParametrosDisponibilidad): HoraDisponible[] {
  const dow = diaSemana(dia);
  return horarios
    .filter((horario) => Number(horario.dia_semana) === dow)
    .map((horario) => ({ hora: horaCorta(horario.hora), aviso_tarde: horario.aviso_tarde === true }))
    .filter((franja) => !estaCompleta(ocupacion, franja.hora, capacidad, modo, maxDia) && !esHoraPasada(dia, franja.hora, ahora) && !esAntesDelMinimo(dia, franja.hora, minimo));
}

/** ¿La hora elegida sigue siendo válida (no llena, no pasada)? */
export function horaSigueDisponible(hora: string, parametros: ParametrosDisponibilidad): boolean {
  return horasDisponibles(parametros).some((franja) => franja.hora === hora);
}
