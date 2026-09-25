// Días de cierre del taller (festivos_taller: festivos y, más adelante, vacaciones) como eventos de
// día completo en su Google Calendar: "🔒 Taller cerrado · Navidad". Aquí solo la lógica pura
// (agrupar días seguidos y decidir qué crear y qué borrar); las llamadas a Google están en google.ts
// y la sincronización en calendarioCierres.ts.
//
// Los eventos de CiTaller llevan propiedades privadas (citaller=cierre y una clave por bloque): así la
// sincronización solo toca los suyos, nunca los que el taller apunta a mano, y no hace falta guardar
// ids en la base de datos.

export interface DiaCierre {
  /** "YYYY-MM-DD" */
  fecha: string;
  nombre: string;
}

export interface BloqueCierre {
  /** Primer día cerrado, "YYYY-MM-DD". */
  inicio: string;
  /** Día siguiente al último cerrado (Google usa el final exclusivo en los eventos de día completo). */
  finExclusivo: string;
  nombre: string;
  /** Identifica el bloque en Google: si cambian las fechas o el nombre, es otro bloque. */
  clave: string;
}

export interface EventoCierreExistente {
  id: string;
  clave: string | null;
}

/** "YYYY-MM-DD" de hoy en Madrid (la zona de los talleres), sin depender de la del servidor. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** "YYYY-MM-DD" + n días, sin depender de la zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Resumen de 8 cifras del nombre, para que la clave sea corta y sin caracteres raros (FNV-1a). */
function resumenTexto(texto: string): string {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(texto)) {
    h ^= c;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function claveBloque(inicio: string, finExclusivo: string, nombre: string): string {
  return `${inicio}_${finExclusivo}_${resumenTexto(nombre.trim())}`;
}

/** Junta en un bloque los días seguidos con el mismo nombre (vacaciones de dos semanas = un evento). */
export function agruparCierres(dias: DiaCierre[]): BloqueCierre[] {
  const ordenados = [...new Map(dias.map((d) => [d.fecha, d])).values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const bloques: Array<Omit<BloqueCierre, "clave">> = [];
  for (const dia of ordenados) {
    const ultimo = bloques.at(-1);
    if (ultimo && ultimo.finExclusivo === dia.fecha && ultimo.nombre.trim() === dia.nombre.trim()) {
      ultimo.finExclusivo = sumarDias(dia.fecha, 1);
    } else {
      bloques.push({ inicio: dia.fecha, finExclusivo: sumarDias(dia.fecha, 1), nombre: dia.nombre.trim() });
    }
  }
  return bloques.map((b) => ({ ...b, clave: claveBloque(b.inicio, b.finExclusivo, b.nombre) }));
}

/**
 * Qué hay que hacer en Google para que sus eventos de cierre sean exactamente los bloques deseados:
 * crear los que faltan y borrar los que sobran (los de días que ya no están cerrados y los duplicados).
 */
export function planSincronizacion(deseados: BloqueCierre[], existentes: EventoCierreExistente[]): { crear: BloqueCierre[]; borrar: string[] } {
  const claves = new Set(deseados.map((b) => b.clave));
  const vistos = new Set<string>();
  const borrar: string[] = [];
  for (const evento of existentes) {
    if (evento.clave && claves.has(evento.clave) && !vistos.has(evento.clave)) vistos.add(evento.clave);
    else borrar.push(evento.id);
  }
  return { crear: deseados.filter((b) => !vistos.has(b.clave)), borrar };
}

/** Texto del evento. */
export function resumenCierre(nombre: string): string {
  return `🔒 Taller cerrado · ${nombre}`;
}

export const DESCRIPCION_CIERRE = "Día de cierre del taller en CiTaller: la web no ofrece citas estos días. Se actualiza solo desde CiTaller.";
