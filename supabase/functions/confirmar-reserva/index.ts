// Confirmar una cita desde el panel. Entrada (POST, JWT del usuario del taller): { reserva_id }.
// Cambia el estado a Confirmada (si estaba Pendiente) y lanza las notificaciones: WhatsApp según
// el modo del taller y evento en Google Calendar. Si ya estaba Confirmada, reintenta las
// notificaciones pendientes: "reintentar" es volver a pulsar.
// Salida: { ok, estado, notificaciones }.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { trasConfirmar } from "../_shared/notificar.ts";
import { leerReserva, leerTaller } from "../_shared/reservas.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";

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

    let reserva = await leerReserva(admin, reservaId);
    if (!reserva) return responderJson({ ok: false, error: "Reserva no encontrada" }, 404);

    if (!(await puedeGestionarTaller(admin, usuario.id, reserva.taller_id))) {
      return responderJson({ ok: false, error: "No tienes permiso para esta reserva" }, 403);
    }

    if (reserva.estado === "Cancelada") {
      return responderJson({ ok: false, codigo: "CT012", error: "Esta cita está cancelada y no se puede reabrir" }, 409);
    }

    if (reserva.estado === "Pendiente") {
      const { data, error } = await admin.from("reservas").update({ estado: "Confirmada" }).eq("id", reserva.id).eq("estado", "Pendiente").select("id");
      if (error) {
        console.error("confirmar-reserva: error actualizando:", error);
        return responderJson({ ok: false, codigo: error.code, error: "No se pudo confirmar la cita" }, 400);
      }
      if (!data || data.length === 0) {
        return responderJson({ ok: false, error: "La cita cambió mientras tanto. Recarga el panel." }, 409);
      }
      reserva = (await leerReserva(admin, reserva.id)) ?? reserva;
    }

    const taller = await leerTaller(admin, reserva.taller_id);
    if (!taller) return responderJson({ ok: false, error: "Taller no encontrado" }, 404);

    const notificaciones = await trasConfirmar(admin, reserva, taller);
    return responderJson({ ok: true, estado: "Confirmada", notificaciones });
  } catch (error) {
    console.error("confirmar-reserva:", error);
    return responderJson({ ok: false, error: "Error interno confirmando la cita" }, 500);
  }
});
