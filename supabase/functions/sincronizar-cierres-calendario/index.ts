// Días de cierre (festivos y vacaciones de festivos_taller) en el Google Calendar de cada taller
// conectado: crea los bloques "🔒 Taller cerrado · …" que faltan y borra los que ya no están.
// La llama pg_cron cada noche (job citaller-cierres-calendario) con la cabecera x-cron-secret; también
// se lanza sola al conectar Google Calendar (google-calendar-callback).
// Cuerpo opcional: { taller_id } para un solo taller (pruebas, o justo después de cargar vacaciones).
// Salida: { ok, hoy, resultados: [{ taller_id, creados, borrados, bloques } | { motivo } | { error }] }.

import { hoyEnMadrid } from "../_shared/cierres.ts";
import { sincronizarCierresTaller, type ResultadoCierres } from "../_shared/calendarioCierres.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const preflight = respuestaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return responderJson({ ok: false, error: "Método no permitido" }, 405);

  try {
    const cronSecret = Deno.env.get("CITALLER_CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return responderJson({ ok: false, error: "Cron no autorizado" }, 401);
    }

    const admin = crearClienteAdmin();
    const soloTaller = idPositivo((await leerCuerpoJson(req)).taller_id);

    let consulta = admin.from("integraciones_calendario").select("taller_id").eq("proveedor", "google").eq("conectado", true);
    if (soloTaller) consulta = consulta.eq("taller_id", soloTaller);
    const { data, error } = await consulta;
    if (error) {
      console.error("cierres: error leyendo integraciones:", error);
      return responderJson({ ok: false, error: error.message }, 500);
    }

    const hoy = hoyEnMadrid();
    const resultados: ResultadoCierres[] = [];
    for (const { taller_id } of (data ?? []) as Array<{ taller_id: number }>) {
      resultados.push(await sincronizarCierresTaller(admin, taller_id, hoy));
    }
    return responderJson({ ok: true, hoy, resultados });
  } catch (error) {
    console.error("cierres:", error);
    return responderJson({ ok: false, error: "Error interno sincronizando los días de cierre" }, 500);
  }
});
