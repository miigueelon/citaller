// Crea en el Google Calendar del taller el evento de una reserva confirmada.
// Entrada (POST, JWT del usuario del taller): { reserva_id }
// Salida: { ok, evento_creado, google_event_id?, google_event_html_link?, mensaje?|error? }
// Idempotente: si la reserva ya tiene google_event_id no crea otro.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import {
  accessTokenDesdeRefresh,
  crearEvento,
  ErrorGoogle,
  sumarMinutosLocal,
} from "../_shared/google.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";
import { leerIntegracionGoogle } from "../_shared/tokensCalendario.ts";

// De momento todas las citas duran 60 minutos (duración por servicio: roadmap).
const DURACION_MINUTOS = 60;

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
      .select("id, taller_id, nombre, telefono, matricula, vehiculo, servicio, descripcion, dia, hora, estado, google_event_id")
      .eq("id", reservaId)
      .maybeSingle();
    if (reservaError || !reserva) {
      return responderJson({ ok: false, error: "Reserva no encontrada" }, 404);
    }

    if (!(await puedeGestionarTaller(admin, usuario.id, reserva.taller_id))) {
      return responderJson({ ok: false, error: "No tienes permiso para esta reserva" }, 403);
    }

    if (reserva.estado !== "Confirmada") {
      return responderJson({ ok: false, error: "La reserva todavía no está confirmada" }, 400);
    }

    if (reserva.google_event_id) {
      return responderJson({
        ok: true,
        evento_creado: false,
        mensaje: "Esta reserva ya tiene evento en Google Calendar",
        google_event_id: reserva.google_event_id,
      });
    }

    const integracion = await leerIntegracionGoogle(admin, reserva.taller_id);
    if (!integracion) {
      return responderJson({ ok: false, error: "Google Calendar no está conectado para este taller" }, 400);
    }

    const horaInicio = String(reserva.hora).substring(0, 5);
    const descripcion = [
      `Cliente: ${reserva.nombre || "-"}`,
      `Teléfono: ${reserva.telefono || "-"}`,
      `Vehículo: ${reserva.vehiculo || "-"}`,
      `Matrícula: ${reserva.matricula || "-"}`,
      `Servicio: ${reserva.servicio || "-"}`,
      reserva.descripcion ? `Descripción: ${reserva.descripcion}` : null,
      `Reserva CiTaller #${reserva.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    let evento: { id: string; htmlLink: string | null };
    try {
      const accessToken = await accessTokenDesdeRefresh(integracion.refreshToken);
      evento = await crearEvento(accessToken, integracion.calendarId, {
        resumen: `${reserva.servicio} · ${reserva.nombre}`,
        descripcion,
        inicioLocal: `${reserva.dia}T${horaInicio}:00`,
        finLocal: sumarMinutosLocal(reserva.dia, horaInicio, DURACION_MINUTOS),
      });
    } catch (error) {
      if (!(error instanceof ErrorGoogle)) throw error;
      console.error("crear-evento-google: error de Google:", error.status, error.detalle);
      return responderJson(
        {
          ok: false,
          evento_creado: false,
          error: error.conexionCaducada
            ? "La conexión con Google Calendar ha caducado. Vuelve a conectarla desde el panel."
            : error.message,
        },
        502,
      );
    }

    const { error: guardarError } = await admin
      .from("reservas")
      .update({ google_event_id: evento.id, google_event_html_link: evento.htmlLink })
      .eq("id", reserva.id)
      .eq("taller_id", reserva.taller_id);
    if (guardarError) {
      console.error("crear-evento-google: evento creado pero no se guardó su id:", guardarError);
      return responderJson({
        ok: true,
        evento_creado: true,
        aviso: "Evento creado, pero no se pudo guardar su ID en CiTaller",
        google_event_id: evento.id,
      });
    }

    return responderJson({
      ok: true,
      evento_creado: true,
      mensaje: "Evento creado correctamente en Google Calendar",
      google_event_id: evento.id,
      google_event_html_link: evento.htmlLink,
    });
  } catch (error) {
    console.error("crear-evento-google:", error);
    return responderJson({ ok: false, evento_creado: false, error: "Error interno creando el evento" }, 500);
  }
});
