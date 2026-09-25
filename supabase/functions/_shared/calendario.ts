import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { accessTokenDesdeRefresh, borrarEvento, crearEvento, ErrorGoogle, sumarMinutosLocal } from "./google.ts";
import { leerEtiquetasCampos, type ReservaCompleta } from "./reservas.ts";
import { leerIntegracionGoogle } from "./tokensCalendario.ts";

// De momento todas las citas duran 60 minutos (duración por servicio: roadmap).
const DURACION_MINUTOS = 60;

export type ResultadoCalendario =
  | { creado: true; google_event_id: string }
  | { creado: false; motivo: "ya_existe" | "sin_calendario" }
  | { creado: false; error: string };

/** Crea el evento de una reserva confirmada y guarda su id. Idempotente. */
export async function crearEventoDeReserva(admin: SupabaseClient, reserva: ReservaCompleta): Promise<ResultadoCalendario> {
  if (reserva.google_event_id) return { creado: false, motivo: "ya_existe" };

  const integracion = await leerIntegracionGoogle(admin, reserva.taller_id);
  if (!integracion) return { creado: false, motivo: "sin_calendario" };

  const etiquetas = await leerEtiquetasCampos(admin, reserva.taller_id);
  const extras = Object.entries(reserva.datos_extra ?? {})
    .filter(([, valor]) => valor !== null && valor !== undefined && String(valor).trim() !== "")
    .map(([clave, valor]) => `${etiquetas[clave]?.etiqueta ?? clave}: ${String(valor)}${etiquetas[clave]?.unidad ? ` ${etiquetas[clave].unidad}` : ""}`);

  const descripcion = [
    `Cliente: ${reserva.nombre || "-"}`,
    `Teléfono: ${reserva.telefono || "-"}`,
    `Vehículo: ${reserva.vehiculo || "-"}`,
    `Matrícula: ${reserva.matricula || "-"}`,
    `Servicio: ${reserva.servicio || "-"}`,
    ...extras,
    reserva.descripcion ? `Descripción: ${reserva.descripcion}` : null,
    reserva.creada_por === "taller" ? "Cita apuntada en el mostrador" : null,
    `Reserva CiTaller #${reserva.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const horaInicio = reserva.hora.substring(0, 5);
  try {
    const accessToken = await accessTokenDesdeRefresh(integracion.refreshToken);
    const evento = await crearEvento(accessToken, integracion.calendarId, {
      resumen: `${reserva.servicio ?? "Cita"} · ${reserva.nombre ?? ""}`.trim(),
      descripcion,
      inicioLocal: `${reserva.dia}T${horaInicio}:00`,
      finLocal: sumarMinutosLocal(reserva.dia, horaInicio, DURACION_MINUTOS),
    });
    const { error } = await admin
      .from("reservas")
      .update({ google_event_id: evento.id, google_event_html_link: evento.htmlLink, google_error: null })
      .eq("id", reserva.id);
    if (error) console.error("calendario: evento creado pero no se guardó su id:", error);
    return { creado: true, google_event_id: evento.id };
  } catch (fallo) {
    const mensaje = mensajeDeGoogle(fallo);
    console.error("calendario: error creando el evento:", fallo instanceof ErrorGoogle ? fallo.detalle : fallo);
    await admin.from("reservas").update({ google_error: mensaje }).eq("id", reserva.id);
    return { creado: false, error: mensaje };
  }
}

export type ResultadoBorrado = { borrado: true } | { borrado: false; motivo: "sin_evento" | "sin_calendario" } | { borrado: false; error: string };

/** Borra el evento de una reserva y limpia su id. Mejor esfuerzo: si falla, se registra y no bloquea. */
export async function borrarEventoDeReserva(admin: SupabaseClient, reserva: ReservaCompleta): Promise<ResultadoBorrado> {
  if (!reserva.google_event_id) return { borrado: false, motivo: "sin_evento" };

  const integracion = await leerIntegracionGoogle(admin, reserva.taller_id);
  if (!integracion) {
    await admin.from("reservas").update({ google_error: "Google Calendar no está conectado: el evento no se borró" }).eq("id", reserva.id);
    return { borrado: false, motivo: "sin_calendario" };
  }

  try {
    const accessToken = await accessTokenDesdeRefresh(integracion.refreshToken);
    await borrarEvento(accessToken, integracion.calendarId, reserva.google_event_id);
    await admin.from("reservas").update({ google_event_id: null, google_event_html_link: null, google_error: null }).eq("id", reserva.id);
    return { borrado: true };
  } catch (fallo) {
    const mensaje = mensajeDeGoogle(fallo);
    console.error("calendario: error borrando el evento:", fallo instanceof ErrorGoogle ? fallo.detalle : fallo);
    await admin.from("reservas").update({ google_error: mensaje }).eq("id", reserva.id);
    return { borrado: false, error: mensaje };
  }
}

export function mensajeDeGoogle(fallo: unknown): string {
  if (fallo instanceof ErrorGoogle) {
    return fallo.conexionCaducada ? "La conexión con Google Calendar ha caducado. Vuelve a conectarla desde el panel." : fallo.message;
  }
  return fallo instanceof Error ? fallo.message : "Error con Google Calendar";
}
