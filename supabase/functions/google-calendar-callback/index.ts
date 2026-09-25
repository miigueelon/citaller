// Vuelta de Google tras "Conectar Google Calendar". La llama el navegador redirigido por Google
// (sin JWT: verify_jwt = false). La seguridad la da el `state` de un solo uso creado por
// conectar-google-calendar.
// Resultado: redirige a la URL de la app guardada en el state con ?calendar=connected
// o ?calendar=error&motivo=...

import { puedeGestionarTaller } from "../_shared/autorizar.ts";
import { sincronizarCierresTaller } from "../_shared/calendarioCierres.ts";
import { hoyEnMadrid } from "../_shared/cierres.ts";
import { cambiarCodigoPorTokens, ErrorGoogle } from "../_shared/google.ts";
import { redirigir } from "../_shared/http.ts";
import { conParametros, urlDeVuelta } from "../_shared/origenes.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";
import { guardarRefreshTokenGoogle, leerIntegracionGoogle } from "../_shared/tokensCalendario.ts";

// Runtime de Supabase Edge Functions: deja terminar una tarea después de responder.
declare const EdgeRuntime: { waitUntil(promesa: Promise<unknown>): void } | undefined;

function textoPlano(mensaje: string, status: number): Response {
  return new Response(mensaje, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const errorGoogle = url.searchParams.get("error");

  if (!state) return textoPlano("Falta el parámetro state.", 400);

  let admin;
  let fila: { taller_id: number; user_id: string | null; volver_a: string | null; expires_at: string } | null;
  try {
    admin = crearClienteAdmin();
    // Un solo uso: se borra y se lee en la misma operación.
    const { data, error } = await admin
      .from("google_oauth_states")
      .delete()
      .eq("state", state)
      .select("taller_id, user_id, volver_a, expires_at")
      .maybeSingle();
    if (error) throw error;
    fila = data;
  } catch (error) {
    console.error("google-calendar-callback: error leyendo el state:", error);
    return textoPlano("Error interno conectando Google Calendar.", 500);
  }

  if (!fila) {
    return textoPlano(
      "La autorización no es válida o ya se usó. Vuelve al panel y pulsa otra vez «Conectar Google Calendar».",
      400,
    );
  }

  const volverA = urlDeVuelta(fila.volver_a, fila.taller_id);
  const volverConError = (motivo: string) =>
    redirigir(conParametros(volverA, { calendar: "error", motivo }));

  if (new Date(fila.expires_at).getTime() < Date.now()) return volverConError("caducado");
  if (errorGoogle) return volverConError(errorGoogle);
  if (!code) return volverConError("sin_codigo");
  if (!fila.user_id || !(await puedeGestionarTaller(admin, fila.user_id, fila.taller_id))) {
    return volverConError("sin_permiso");
  }

  try {
    const { refreshToken, scope } = await cambiarCodigoPorTokens(code);

    // Con prompt=consent Google siempre manda refresh token; por si acaso, se reutiliza el anterior.
    const token = refreshToken ?? (await leerIntegracionGoogle(admin, fila.taller_id))?.refreshToken ?? null;
    if (!token) return volverConError("sin_refresh_token");

    await guardarRefreshTokenGoogle(admin, fila.taller_id, token, scope);

    // Los días de cierre, en segundo plano: la vuelta al panel no espera y un fallo no la estropea
    // (la sincronización de cada noche lo vuelve a intentar).
    const cierres = sincronizarCierresTaller(admin, fila.taller_id, hoyEnMadrid()).catch((fallo) => console.error("google-calendar-callback: cierres:", fallo));
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(cierres);

    return redirigir(conParametros(volverA, { calendar: "connected" }));
  } catch (error) {
    console.error("google-calendar-callback:", error instanceof ErrorGoogle ? error.detalle : error);
    return volverConError(error instanceof ErrorGoogle ? "google" : "interno");
  }
});
