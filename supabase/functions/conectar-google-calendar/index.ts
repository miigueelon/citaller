// Inicio de "Conectar Google Calendar" desde el panel del taller.
// Entrada (POST, JWT del usuario del taller): { taller_id, volver_a? }
// Salida: { ok: true, auth_url } → el navegador va a Google; Google vuelve a google-calendar-callback.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import { urlAutorizacion } from "../_shared/google.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { urlDeVuelta } from "../_shared/origenes.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";

const MINUTOS_VALIDEZ_STATE = 10;

function generarState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const preflight = respuestaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return responderJson({ ok: false, error: "Método no permitido" }, 405);

  try {
    const admin = crearClienteAdmin();

    const usuario = await usuarioDeLaPeticion(req, admin);
    if (!usuario) return responderJson({ ok: false, error: "Usuario no autenticado" }, 401);

    const cuerpo = await leerCuerpoJson(req);
    const tallerId = idPositivo(cuerpo.taller_id);
    if (!tallerId) return responderJson({ ok: false, error: "Falta taller_id" }, 400);

    if (!(await puedeGestionarTaller(admin, usuario.id, tallerId))) {
      return responderJson({ ok: false, error: "No tienes permiso para este taller" }, 403);
    }

    // Los state son de un solo uso y duran 10 minutos: se limpian los caducados del taller.
    await admin
      .from("google_oauth_states")
      .delete()
      .eq("taller_id", tallerId)
      .lt("expires_at", new Date().toISOString());

    const state = generarState();
    const { error } = await admin.from("google_oauth_states").insert({
      state,
      taller_id: tallerId,
      user_id: usuario.id,
      volver_a: urlDeVuelta(cuerpo.volver_a, tallerId),
      expires_at: new Date(Date.now() + MINUTOS_VALIDEZ_STATE * 60_000).toISOString(),
    });
    if (error) {
      console.error("conectar-google-calendar: no se pudo guardar el state:", error);
      return responderJson({ ok: false, error: "No se pudo iniciar la conexión con Google" }, 500);
    }

    return responderJson({ ok: true, auth_url: urlAutorizacion(state) });
  } catch (error) {
    console.error("conectar-google-calendar:", error);
    return responderJson({ ok: false, error: "Error interno iniciando la conexión con Google" }, 500);
  }
});
