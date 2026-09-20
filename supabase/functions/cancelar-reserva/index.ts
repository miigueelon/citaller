// Cancelar una cita desde el panel (pendiente o confirmada). Entrada (POST, JWT): { reserva_id }.
// Cambia el estado a Cancelada con cancelada_por = 'taller', avisa al cliente por WhatsApp según
// el modo del taller (también si estaba pendiente: decisión del 20-sep) y borra el evento de
// Google a mejor esfuerzo. Salida: { ok, estado, notificaciones }.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { trasCancelar } from "../_shared/notificar.ts";
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

    const taller = await leerTaller(admin, reserva.taller_id);
    if (!taller) return responderJson({ ok: false, error: "Taller no encontrado" }, 404);

    if (reserva.estado !== "Cancelada") {
      const { data, error } = await admin
        .from("reservas")
        .update({ estado: "Cancelada", cancelada_por: "taller" })
        .eq("id", reserva.id)
        .in("estado", ["Pendiente", "Confirmada"])
        .select("id");
      if (error) {
        console.error("cancelar-reserva: error actualizando:", error);
        return responderJson({ ok: false, codigo: error.code, error: "No se pudo cancelar la cita" }, 400);
      }
      if (!data || data.length === 0) {
        return responderJson({ ok: false, error: "La cita cambió mientras tanto. Recarga el panel." }, 409);
      }
      reserva = (await leerReserva(admin, reserva.id)) ?? reserva;
    }

    // Si ya estaba cancelada, se reintentan las notificaciones pendientes (WhatsApp no enviado, evento sin borrar).
    const notificaciones = await trasCancelar(admin, reserva, taller, { avisarCliente: true });
    return responderJson({ ok: true, estado: "Cancelada", notificaciones });
  } catch (error) {
    console.error("cancelar-reserva:", error);
    return responderJson({ ok: false, error: "Error interno cancelando la cita" }, 500);
  }
});
