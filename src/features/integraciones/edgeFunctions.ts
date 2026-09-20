// Nombres de las Edge Functions de Supabase que invoca el navegador.
// Único sitio del frontend que los conoce: renombrar una función es cambiar una línea aquí
// (desplegando antes la nueva; ver docs/integraciones.md).
// No aparecen aquí `google-calendar-callback` (la llama Google) ni
// `enviar-whatsapp-recordatorios` (la llama pg_cron): el navegador nunca las invoca.
export const EDGE_FUNCTIONS = {
  /** Devuelve { ok, auth_url } para empezar el OAuth de Google. Body: { taller_id, volver_a }. */
  conectarGoogleCalendar: "conectar-google-calendar",
  /** Crea el evento de Google Calendar de una reserva confirmada. Body: { reserva_id }. */
  crearEventoGoogle: "crear-evento-google",
  /** Borra el evento de Google Calendar de una reserva que se cancela. Body: { reserva_id }. */
  cancelarEventoGoogle: "cancelar-evento-google",
  /** Envía la plantilla de WhatsApp `confirmacion_cita` (Meta Cloud API). Body: { reserva_id }. */
  enviarWhatsappConfirmacion: "enviar-whatsapp-confirmacion",
} as const;

/** Respuesta común de las funciones: `ok` y, opcionalmente, mensaje, aviso o error. */
export interface RespuestaFuncion {
  ok?: boolean;
  mensaje?: string;
  aviso?: string;
  error?: string;
  auth_url?: string;
}

/** Google solo puede pedir credenciales desde su propio dominio. */
export function esUrlDeGoogle(url: string): boolean {
  try {
    return new URL(url).origin === "https://accounts.google.com";
  } catch {
    return false;
  }
}
