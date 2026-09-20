// Nombres de las Edge Functions de Supabase que invoca el navegador.
// Único sitio del frontend que los conoce: renombrar una función es cambiar una línea aquí
// (desplegando antes la nueva; ver docs/integraciones.md).
// No aparecen aquí `google-calendar-callback` (la llama Google) ni
// `enviar-whatsapp-recordatorios` (la llama pg_cron): el navegador nunca las invoca.
export const EDGE_FUNCTIONS = {
  /** Devuelve { ok, auth_url } para empezar el OAuth de Google. Body: { taller_id, volver_a }. */
  conectarGoogleCalendar: "conectar-google-calendar",
  /** Confirma una cita: estado, WhatsApp según el modo del taller y Google Calendar. Body: { reserva_id }. */
  confirmarReserva: "confirmar-reserva",
  /** Cancela una cita desde el panel: estado, WhatsApp de cancelación y borrado del evento. Body: { reserva_id }. */
  cancelarReserva: "cancelar-reserva",
  /** Cita apuntada a mano desde el panel (nace confirmada). Body: datos de la reserva. */
  crearReservaTaller: "crear-reserva-taller",
  /** Cancelación por el cliente con el enlace de su cita. Body: { token }. Sin sesión. */
  cancelarCitaCliente: "cancelar-cita-cliente",
} as const;

/** Estado de cada notificación tras confirmar, cancelar o crear una cita. */
export interface ResultadoNotificaciones {
  whatsapp: { modo: "api" | "enlace" | "ninguno"; enviado: boolean; motivo?: string; error?: string };
  calendario: { creado?: boolean; borrado?: boolean; error?: string };
}

/** Respuesta común de las funciones. */
export interface RespuestaFuncion {
  ok?: boolean;
  codigo?: string;
  mensaje?: string;
  aviso?: string;
  error?: string;
  auth_url?: string;
  estado?: string;
  reserva_id?: number;
  token_publico?: string;
  notificaciones?: ResultadoNotificaciones;
}

/** Google solo puede pedir credenciales desde su propio dominio. */
export function esUrlDeGoogle(url: string): boolean {
  try {
    return new URL(url).origin === "https://accounts.google.com";
  } catch {
    return false;
  }
}
