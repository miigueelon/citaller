// Borra del Google Calendar del taller el evento de una reserva que se va a cancelar.
// Entrada (POST, JWT del usuario del taller): { reserva_id }
// Salida: { ok, evento_eliminado, mensaje?|aviso?|error? }
//
// Mejor esfuerzo (docs/plan.md, flujo D): si Google falla (conexión caducada, Google caído...)
// responde ok: true con evento_eliminado: false y un aviso, para que el panel pueda cancelar
// la reserva igualmente; google_event_id se conserva para poder borrarlo más tarde.
// Solo responde ok: false si la petición no es válida o el usuario no tiene permiso.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import { accessTokenDesdeRefresh, borrarEvento, ErrorGoogle } from "../_shared/google.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";
import { leerIntegracionGoogle } from "../_shared/tokensCalendario.ts";

Deno.serve(async (req) => {
  const preflight = respuestaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return responderJson({ ok: false, error: "Método no permitido" }, 405);

  try {
    const admin = crearClienteAdmin();

    const usuario = await usuarioDeLaPeticion(req, admin);
    if (!usuario) return responderJson({ ok: false, error: "Usuario no autenticado" }, 401);

    const reservaId = idPositivo((await leerCuerpoJson(req)).reserva_id);
    if (!reservaId) return responderJson({ ok: false, error: "Falta reserva_id" }, 400);

    const { data: reserva, error: reservaError } = await admin
      .from("reservas")
      .select("id, taller_id, google_event_id")
      .eq("id", reservaId)
      .maybeSingle();
    if (reservaError || !reserva) {
      return responderJson({ ok: false, error: "Reserva no encontrada" }, 404);
    }

    if (!(await puedeGestionarTaller(admin, usuario.id, reserva.taller_id))) {
      return responderJson({ ok: false, error: "No tienes permiso para esta reserva" }, 403);
    }

    if (!reserva.google_event_id) {
      return responderJson({
        ok: true,
        evento_eliminado: false,
        mensaje: "La reserva no tenía evento de Google Calendar",
      });
    }

    const integracion = await leerIntegracionGoogle(admin, reserva.taller_id);
    if (!integracion) {
      return responderJson({
        ok: true,
        evento_eliminado: false,
        aviso: "Google Calendar no está conectado: el evento no se ha borrado del calendario",
      });
    }

    try {
      const accessToken = await accessTokenDesdeRefresh(integracion.refreshToken);
      await borrarEvento(accessToken, integracion.calendarId, reserva.google_event_id);
    } catch (error) {
      if (!(error instanceof ErrorGoogle)) throw error;
      console.error("cancelar-evento-google: error de Google:", error.status, error.detalle);
      return responderJson({
        ok: true,
        evento_eliminado: false,
        aviso: error.conexionCaducada
          ? "La conexión con Google Calendar ha caducado: borra el evento a mano y vuelve a conectar el calendario"
          : "Google Calendar no respondió: el evento no se ha borrado del calendario",
      });
    }

    const { error: limpiarError } = await admin
      .from("reservas")
      .update({ google_event_id: null, google_event_html_link: null })
      .eq("id", reserva.id)
      .eq("taller_id", reserva.taller_id);
    if (limpiarError) {
      console.error("cancelar-evento-google: evento borrado pero no se limpió su id:", limpiarError);
      return responderJson({
        ok: true,
        evento_eliminado: true,
        aviso: "Evento eliminado, pero no se pudo limpiar su ID en CiTaller",
      });
    }

    return responderJson({
      ok: true,
      evento_eliminado: true,
      mensaje: "Evento eliminado de Google Calendar",
    });
  } catch (error) {
    console.error("cancelar-evento-google:", error);
    return responderJson({ ok: false, evento_eliminado: false, error: "Error interno cancelando el evento" }, 500);
  }
});
