// Cita apuntada a mano desde el panel (cliente que viene en persona). Entrada (POST, JWT):
// { taller_id, nombre, telefono?, matricula, vehiculo, servicio, descripcion?, dia, hora, datos_extra? }.
// Nace Confirmada (insertar_reserva_taller valida y no aplica el aforo: el taller elige cualquier
// hora) y lanza las mismas notificaciones que confirmar: WhatsApp solo si hay teléfono, Calendar
// si está conectado. Salida: { ok, reserva_id, token_publico, notificaciones }.

import { puedeGestionarTaller, usuarioDeLaPeticion } from "../_shared/autorizar.ts";
import { idPositivo, leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { trasConfirmar } from "../_shared/notificar.ts";
import { leerReserva, leerTaller } from "../_shared/reservas.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
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

    const datosExtra = cuerpo.datos_extra && typeof cuerpo.datos_extra === "object" && !Array.isArray(cuerpo.datos_extra) ? cuerpo.datos_extra : {};

    const { data, error } = await admin.rpc("insertar_reserva_taller", {
      p_taller_id: tallerId,
      p_matricula: texto(cuerpo.matricula),
      p_nombre: texto(cuerpo.nombre),
      p_telefono: texto(cuerpo.telefono),
      p_vehiculo: texto(cuerpo.vehiculo),
      p_servicio: texto(cuerpo.servicio),
      p_descripcion: texto(cuerpo.descripcion),
      p_dia: texto(cuerpo.dia),
      p_hora: texto(cuerpo.hora),
      p_datos_extra: datosExtra,
      // Quién la apunta. La función SQL exige uno activo del taller si el taller tiene miembros (CT017).
      p_miembro_id: idPositivo(cuerpo.miembro_id),
    });

    if (error) {
      console.error("crear-reserva-taller: la base de datos rechazó la cita:", error);
      const codigo = typeof error.code === "string" && error.code.startsWith("CT") ? error.code : undefined;
      return responderJson({ ok: false, codigo, error: error.message }, 400);
    }

    const fila = Array.isArray(data) ? data[0] : data;
    const reservaId = fila?.reserva_id as number | undefined;
    if (!reservaId) return responderJson({ ok: false, error: "No se pudo crear la cita" }, 500);

    const reserva = await leerReserva(admin, reservaId);
    const taller = await leerTaller(admin, tallerId);
    if (!reserva || !taller) return responderJson({ ok: false, error: "La cita se creó pero no se pudo leer" }, 500);

    const notificaciones = await trasConfirmar(admin, reserva, taller);
    return responderJson({ ok: true, reserva_id: reserva.id, token_publico: reserva.token_publico, notificaciones });
  } catch (error) {
    console.error("crear-reserva-taller:", error);
    return responderJson({ ok: false, error: "Error interno creando la cita" }, 500);
  }
});
