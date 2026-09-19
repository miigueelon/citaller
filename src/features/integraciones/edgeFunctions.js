// Slugs de las Edge Functions desplegadas en Supabase a 19-sep-2026.
// Único sitio del frontend que conoce los nombres: renombrar una función es cambiar una línea aquí
// (desplegando antes la nueva; ver docs/integraciones.md). Los slugs los asignó el dashboard y no
// describen lo que hacen; la tabla "qué hace cada una" está en docs/integraciones.md.
// No aparecen aquí `bright-service` (callback de OAuth, la llama Google) ni `hyper-processor`
// (recordatorios, la llama pg_cron) porque el navegador nunca las invoca.
export const EDGE_FUNCTIONS = Object.freeze({
  /** Crea el evento de Google Calendar de una reserva confirmada. Body: { reserva_id }. */
  crearEventoGoogle: "quick-worker",
  /** Borra el evento de Google Calendar de una reserva cancelada. Body: { reserva_id }. */
  cancelarEventoGoogle: "cancelar-evento-google",
  /** Envía la plantilla de WhatsApp `confirmacion_cita` (Meta Cloud API). Body: { reserva_id }. */
  enviarWhatsappConfirmacion: "bright-processor",
  /**
   * Inicio del OAuth de Google ("Conectar Google Calendar"). El panel espera { ok, auth_url },
   * pero el código desplegado en este slug es una copia de "crear evento": el flujo está roto y se
   * sustituye por `conectar-google-calendar` en la fase 1.3 (docs/plan.md).
   */
  conectarGoogleCalendar: "dynamic-function",
});
