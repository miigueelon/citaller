// Cancelación por el cliente desde el enlace de su cita. Entrada (POST, sin sesión): { token }.
// La autorización es el token (uuid) de la reserva. La función SQL cancelar_reserva_cliente aplica
// la regla de las 24 horas y marca cancelada_por = 'cliente'; después se borra el evento de Google
// a mejor esfuerzo. No se avisa a nadie por WhatsApp (decisión del 20-sep): el taller lo ve en el panel.
// Salida: 200 { ok: true, estado: 'Cancelada' } | 404 no_encontrada | 409 fuera_de_plazo | 409 ya_cancelada.

import { leerCuerpoJson, responderJson, respuestaPreflight } from "../_shared/http.ts";
import { trasCancelar } from "../_shared/notificar.ts";
import { leerReserva, leerTaller } from "../_shared/reservas.ts";
import { crearClienteAdmin } from "../_shared/supabaseAdmin.ts";

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESPUESTAS_SQL: Record<string, { status: number; codigo: string; error: string }> = {
  CT010: { status: 404, codigo: "no_encontrada", error: "No encontramos esa cita. Comprueba el enlace." },
  CT011: { status: 409, codigo: "fuera_de_plazo", error: "Ya no se puede cancelar por internet: faltan menos de 24 horas. Llama al taller." },
  CT012: { status: 409, codigo: "ya_cancelada", error: "Esta cita ya estaba cancelada." },
};

Deno.serve(async (req) => {
  const preflight = respuestaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return responderJson({ ok: false, error: "Método no permitido" }, 405);

  try {
    const cuerpo = await leerCuerpoJson(req);
    const token = typeof cuerpo.token === "string" ? cuerpo.token.trim() : "";
    if (!PATRON_UUID.test(token)) return responderJson({ ok: false, codigo: "no_encontrada", error: "Enlace no válido" }, 404);

    const admin = crearClienteAdmin();
    const { data, error } = await admin.rpc("cancelar_reserva_cliente", { p_token: token });

    if (error) {
      const respuesta = RESPUESTAS_SQL[error.code ?? ""];
      if (respuesta) return responderJson({ ok: false, codigo: respuesta.codigo, error: respuesta.error }, respuesta.status);
      console.error("cancelar-cita-cliente: error de la base de datos:", error);
      return responderJson({ ok: false, error: "No se pudo cancelar la cita" }, 500);
    }

    const fila = Array.isArray(data) ? data[0] : data;
    const reservaId = fila?.reserva_id as number | undefined;
    if (!reservaId) return responderJson({ ok: false, error: "No se pudo cancelar la cita" }, 500);

    const reserva = await leerReserva(admin, reservaId);
    const taller = reserva ? await leerTaller(admin, reserva.taller_id) : null;
    if (reserva && taller) {
      await trasCancelar(admin, reserva, taller, { avisarCliente: false });
    }

    return responderJson({ ok: true, estado: "Cancelada" });
  } catch (error) {
    console.error("cancelar-cita-cliente:", error);
    return responderJson({ ok: false, error: "Error interno cancelando la cita" }, 500);
  }
});
