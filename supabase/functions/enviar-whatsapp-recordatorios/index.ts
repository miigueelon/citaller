// Recordatorios de WhatsApp para las citas confirmadas de mañana. La llama pg_cron cada día a las
// 8:00 (job citaller-recordatorios-whatsapp) con la cabecera x-cron-secret. Solo envía a los
// talleres con whatsapp_modo = 'api'; en modo 'enlace' el panel enseña "Citas de mañana" con un
// botón por cita, y en modo 'ninguno' no se avisa. Salida: { ok, fecha_buscada, total, resultados }.

import { corsHeaders, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";
import { enviarPlantilla, ErrorWhatsapp, parametrosRecordatorio, PLANTILLAS, type TallerWhatsapp } from "../_shared/whatsapp.ts";

/** "YYYY-MM-DD" de mañana en la zona del taller (Europe/Madrid). */
function fechaMananaMadrid(): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return new Date(Date.UTC(valor("year"), valor("month") - 1, valor("day") + 1)).toISOString().slice(0, 10);
}

interface ReservaManana {
  id: number;
  taller_id: number;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  servicio: string | null;
  dia: string;
  hora: string;
}

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
    const manana = fechaMananaMadrid();

    const { data: reservas, error } = await admin
      .from("reservas")
      .select("id, taller_id, nombre, telefono, matricula, vehiculo, servicio, dia, hora")
      .eq("estado", "Confirmada")
      .eq("dia", manana)
      .eq("whatsapp_recordatorio_enviado", false)
      .not("telefono", "is", null);
    if (error) {
      console.error("recordatorios: error leyendo reservas:", error);
      return responderJson({ ok: false, error: error.message }, 500);
    }

    const talleres = new Map<number, TallerWhatsapp>();
    const resultados: Array<{ reserva_id: number; taller_id: number; enviado: boolean; motivo?: string }> = [];

    for (const reserva of (reservas ?? []) as ReservaManana[]) {
      let taller = talleres.get(reserva.taller_id);
      if (!taller) {
        const { data } = await admin.from("talleres").select("id, nombre, whatsapp_modo, whatsapp_phone_number_id").eq("id", reserva.taller_id).maybeSingle();
        if (!data) {
          resultados.push({ reserva_id: reserva.id, taller_id: reserva.taller_id, enviado: false, motivo: "Taller no encontrado" });
          continue;
        }
        taller = data as TallerWhatsapp;
        talleres.set(reserva.taller_id, taller);
      }

      if (taller.whatsapp_modo !== "api") {
        resultados.push({ reserva_id: reserva.id, taller_id: taller.id, enviado: false, motivo: `El taller avisa en modo ${taller.whatsapp_modo}` });
        continue;
      }

      try {
        await enviarPlantilla(
          taller,
          reserva.telefono!,
          PLANTILLAS.recordatorio,
          parametrosRecordatorio({
            nombre: reserva.nombre ?? "",
            taller: taller.nombre,
            dia: reserva.dia,
            hora: reserva.hora,
            vehiculo: reserva.vehiculo ?? "",
            servicio: reserva.servicio ?? "",
            matricula: reserva.matricula ?? "",
            enlaceCita: "",
          }),
        );
        await admin
          .from("reservas")
          .update({ whatsapp_recordatorio_enviado: true, whatsapp_recordatorio_fecha: new Date().toISOString(), whatsapp_error: null })
          .eq("id", reserva.id);
        resultados.push({ reserva_id: reserva.id, taller_id: taller.id, enviado: true });
      } catch (fallo) {
        const motivo = fallo instanceof Error ? fallo.message : "Error enviando el recordatorio";
        console.error("recordatorios: fallo en la reserva", reserva.id, fallo instanceof ErrorWhatsapp ? fallo.detalle : fallo);
        await admin.from("reservas").update({ whatsapp_error: motivo }).eq("id", reserva.id);
        resultados.push({ reserva_id: reserva.id, taller_id: taller.id, enviado: false, motivo });
      }
    }

    return responderJson({ ok: true, fecha_buscada: manana, total: reservas?.length ?? 0, resultados });
  } catch (error) {
    console.error("recordatorios:", error);
    return new Response(JSON.stringify({ ok: false, error: "Error interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
