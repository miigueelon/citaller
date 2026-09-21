// Lógica pura de disponibilidad de la pantalla de fecha y hora. Sin React ni red: se prueba sola.
import { diaSemana, esFinDeSemana, esHoraPasada, horaCorta, type Dia, type Hora } from "@/lib/fechas";

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

export function festivoDelDia(festivos: Festivo[], dia: Dia): Festivo | undefined {
  return festivos.find((festivo) => festivo.fecha === dia);
}

/** ¿El taller tiene alguna hora ese día de la semana? */
export function tallerAbre(horarios: Horario[], dia: Dia): boolean {
  const dow = diaSemana(dia);
  return horarios.some((horario) => Number(horario.dia_semana) === dow);
}

/**
 * ¿Se puede elegir ese día en el calendario? Ni fin de semana, ni festivo, y con horario.
 * (El bloqueo del fin de semana es una regla heredada; en la fase 3 manda solo `horarios_taller`.)
 */
export function diaSeleccionable(horarios: Horario[], festivos: Festivo[], dia: Dia): boolean {
  return !esFinDeSemana(dia) && !festivoDelDia(festivos, dia) && tallerAbre(horarios, dia);
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
  ahora: Date;
}

/** Horas del día que se pueden reservar: las del horario, que no estén llenas ni hayan pasado. */
export function horasDisponibles({ horarios, dia, ocupacion, capacidad, modo, maxDia = null, ahora }: ParametrosDisponibilidad): HoraDisponible[] {
  const dow = diaSemana(dia);
  return horarios
    .filter((horario) => Number(horario.dia_semana) === dow)
    .map((horario) => ({ hora: horaCorta(horario.hora), aviso_tarde: horario.aviso_tarde === true }))
    .filter((franja) => !estaCompleta(ocupacion, franja.hora, capacidad, modo, maxDia) && !esHoraPasada(dia, franja.hora, ahora));
}

/** ¿La hora elegida sigue siendo válida (no llena, no pasada)? */
export function horaSigueDisponible(hora: string, parametros: ParametrosDisponibilidad): boolean {
  return horasDisponibles(parametros).some((franja) => franja.hora === hora);
}
