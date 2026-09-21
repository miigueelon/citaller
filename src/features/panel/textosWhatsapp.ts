// Modo "enlace" de WhatsApp: el panel abre wa.me con el mensaje ya escrito y la persona del
// taller lo envía desde su móvil. Lógica pura, probada en textosWhatsapp.test.ts.
// Los textos por taller (talleres.texto_whatsapp_*) pueden llevar estos marcadores:
//   {nombre} {taller} {dia} {hora} {vehiculo} {servicio} {matricula} {enlace_cita} {enlace_reserva}

import { formatearDiaLargo, horaCorta } from "@/lib/fechas";
import type { ReservaPanel } from "./tipos";

export type TipoMensaje = "confirmacion" | "cancelacion" | "recordatorio" | "listo";

/** Textos propios del taller; null = se usa el texto por defecto. */
export type TextosWhatsapp = Record<TipoMensaje, string | null>;

export const TEXTOS_VACIOS: TextosWhatsapp = { confirmacion: null, cancelacion: null, recordatorio: null, listo: null };

export const TEXTOS_POR_DEFECTO: Record<TipoMensaje, string> = {
  confirmacion:
    "Hola {nombre}, te escribimos de {taller}. Tu cita está confirmada para el {dia} a las {hora}: {servicio} ({vehiculo}, {matricula}). " +
    "Si no puedes venir, puedes cancelarla hasta 24 horas antes desde este enlace: {enlace_cita}. ¡Gracias!",
  cancelacion:
    "Hola {nombre}, te escribimos de {taller}. Lamentablemente tenemos que cancelar tu cita del {dia} a las {hora} ({servicio}). " +
    "Puedes pedir otra hora en {enlace_reserva} o llamarnos. Disculpa las molestias.",
  recordatorio: "Hola {nombre}, te recordamos tu cita en {taller} mañana, {dia}, a las {hora}: {servicio} ({vehiculo}). ¡Te esperamos!",
  // "Vehículo listo": cada taller pone lo suyo en el seed ("tu moto" / "tu coche"); esto es el genérico.
  listo: "Hola {nombre}, te escribimos de {taller}. Tu vehículo ({vehiculo}, {matricula}) ya está listo: puedes pasar a recogerlo cuando quieras. ¡Gracias!",
};

export interface DatosMensaje {
  nombre: string;
  taller: string;
  /** "YYYY-MM-DD" */
  dia: string;
  /** "HH:MM" o "HH:MM:SS" */
  hora: string;
  vehiculo: string;
  servicio: string;
  matricula: string;
  enlace_cita: string;
  enlace_reserva: string;
}

/** Sustituye los marcadores; los que no existen en `datos` se dejan vacíos. */
export function rellenarPlantilla(plantilla: string, datos: DatosMensaje): string {
  const valores: Record<string, string> = {
    ...datos,
    dia: datos.dia ? formatearDiaLargo(datos.dia) : "",
    hora: datos.hora ? horaCorta(datos.hora) : "",
  };
  return plantilla.replace(/\{([a-z_]+)\}/g, (_, clave: string) => valores[clave] ?? "").replace(/[ \t]{2,}/g, " ").trim();
}

/** Texto del mensaje de un tipo, con el texto del taller si lo tiene. */
export function textoMensaje(tipo: TipoMensaje, textos: TextosWhatsapp, datos: DatosMensaje): string {
  const plantilla = textos[tipo]?.trim() || TEXTOS_POR_DEFECTO[tipo];
  return rellenarPlantilla(plantilla, datos);
}

/** Enlace que abre WhatsApp con el texto escrito. El teléfono va ya normalizado (34XXXXXXXXX). */
export function enlaceWhatsapp(telefono: string, texto: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

/** Datos de una reserva del panel listos para rellenar cualquier plantilla. */
export function datosDeReserva(reserva: ReservaPanel, taller: { nombre: string; slug: string }, origen: string): DatosMensaje {
  return {
    nombre: reserva.nombre ?? "",
    taller: taller.nombre,
    dia: reserva.dia,
    hora: reserva.hora,
    vehiculo: reserva.vehiculo ?? "",
    servicio: reserva.servicio ?? "",
    matricula: reserva.matricula ?? "",
    enlace_cita: `${origen}/${taller.slug}/cita/${reserva.token_publico}`,
    enlace_reserva: `${origen}/${taller.slug}`,
  };
}

/** Qué mensaje toca según el estado de la reserva; null si no hay nada que avisar. */
export function tipoMensajeDeReserva(reserva: ReservaPanel, esRecordatorio = false): TipoMensaje | null {
  if (!reserva.telefono) return null;
  if (reserva.estado === "Confirmada") return esRecordatorio ? "recordatorio" : "confirmacion";
  if (reserva.estado === "Cancelada" && reserva.cancelada_por === "taller") return "cancelacion";
  return null;
}
