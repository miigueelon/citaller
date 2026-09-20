// Fechas y horas de CiTaller.
//
// Regla del proyecto (CLAUDE.md): una cita es `dia` ("YYYY-MM-DD") + `hora` ("HH:MM" o "HH:MM:SS")
// en hora local del taller. Nunca `new Date("YYYY-MM-DD")`: el navegador lo interpreta en UTC y en
// España sale el día anterior. Todo lo que convierte entre texto y `Date` pasa por aquí.

export type Dia = string; // "YYYY-MM-DD"
export type Hora = string; // "HH:MM" o "HH:MM:SS"

const PATRON_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_HORA = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function dosCifras(n: number): string {
  return String(n).padStart(2, "0");
}

/** `Date` local → "YYYY-MM-DD" (año, mes y día tal como los ve el usuario). */
export function formatearDia(fecha: Date): Dia {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

/** "YYYY-MM-DD" → `Date` a las 00:00 en hora local. Lanza si el formato no es válido. */
export function parsearDia(dia: Dia): Date {
  const partes = PATRON_DIA.exec(dia);
  if (!partes) throw new Error(`Día no válido: "${dia}" (se esperaba YYYY-MM-DD)`);
  const [, anio, mes, diaMes] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(diaMes));
  if (formatearDia(fecha) !== dia) throw new Error(`Día inexistente: "${dia}"`);
  return fecha;
}

export function esDiaValido(dia: string): dia is Dia {
  try {
    parsearDia(dia);
    return true;
  } catch {
    return false;
  }
}

/** Día de hoy en hora local, "YYYY-MM-DD". */
export function hoy(ahora: Date = new Date()): Dia {
  return formatearDia(ahora);
}

export function sumarDias(dia: Dia, dias: number): Dia {
  const fecha = parsearDia(dia);
  fecha.setDate(fecha.getDate() + dias);
  return formatearDia(fecha);
}

/** 0 = domingo … 6 = sábado, igual que `Date.getDay()` y que `horarios_taller.dia_semana`. */
export function diaSemana(dia: Dia): number {
  return parsearDia(dia).getDay();
}

export function esFinDeSemana(dia: Dia): boolean {
  const d = diaSemana(dia);
  return d === 0 || d === 6;
}

/** "HH:MM:SS" o "HH:MM" → "HH:MM". */
export function horaCorta(hora: Hora): string {
  const partes = PATRON_HORA.exec(hora);
  if (!partes) throw new Error(`Hora no válida: "${hora}"`);
  return `${partes[1]}:${partes[2]}`;
}

/** Minutos desde las 00:00. */
export function minutosDelDia(hora: Hora): number {
  const partes = PATRON_HORA.exec(hora);
  if (!partes) throw new Error(`Hora no válida: "${hora}"`);
  return Number(partes[1]) * 60 + Number(partes[2]);
}

/** ¿`dia` es anterior a hoy? */
export function esDiaPasado(dia: Dia, ahora: Date = new Date()): boolean {
  return dia < hoy(ahora);
}

/**
 * ¿La hora ya ha pasado? Solo puede pasar si `dia` es hoy; un día futuro nunca está pasado y un
 * día anterior siempre. En el día de hoy, la hora exacta actual cuenta como pasada.
 */
export function esHoraPasada(dia: Dia, hora: Hora, ahora: Date = new Date()): boolean {
  const diaHoy = hoy(ahora);
  if (dia < diaHoy) return true;
  if (dia > diaHoy) return false;
  return minutosDelDia(hora) <= ahora.getHours() * 60 + ahora.getMinutes();
}

/** "2026-09-21" → "21/09/2026". */
export function formatearDiaCorto(dia: Dia): string {
  const fecha = parsearDia(dia);
  return `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/** "2026-09-21" → "lunes, 21 de septiembre" (o con año si se pide). */
export function formatearDiaLargo(dia: Dia, opciones: { conAnio?: boolean } = {}): string {
  return parsearDia(dia).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(opciones.conAnio ? { year: "numeric" } : {}),
  });
}

/** "Hoy", "Mañana" o el día largo, para agrupar en el panel. */
export function etiquetaDia(dia: Dia, ahora: Date = new Date()): string {
  const diaHoy = hoy(ahora);
  if (dia === diaHoy) return "Hoy";
  if (dia === sumarDias(diaHoy, 1)) return "Mañana";
  return formatearDiaLargo(dia, { conAnio: true });
}
