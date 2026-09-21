import type { ClienteSupabase } from "@/lib/supabase/client";
import { esEstadoReserva, type MiembroTaller, type ReservaPanel } from "./tipos";
import { TEXTOS_VACIOS, type TextosWhatsapp } from "./textosWhatsapp";

// `miembro` trae el nombre de quien apuntó la cita (también si ya está de baja).
const COLUMNAS =
  "id, taller_id, nombre, telefono, matricula, vehiculo, servicio, descripcion, datos_extra, estado, dia, hora, creada_por, cancelada_por, cancelada_en, confirmada_en, token_publico, whatsapp_confirmacion_enviada, whatsapp_cancelacion_enviada, whatsapp_error, google_event_id, google_error, miembro:miembros_taller!creada_por_miembro(nombre)";

/** Reservas del taller, ordenadas por día y hora. La RLS garantiza que solo llegan las suyas. */
export async function cargarReservasTaller(cliente: ClienteSupabase, tallerId: number): Promise<ReservaPanel[]> {
  const { data, error } = await cliente
    .from("reservas")
    .select(COLUMNAS)
    .eq("taller_id", tallerId)
    .order("dia", { ascending: true })
    .order("hora", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ miembro, ...fila }) => ({
    ...fila,
    estado: esEstadoReserva(fila.estado) ? fila.estado : "Pendiente",
    datos_extra: esObjeto(fila.datos_extra) ? fila.datos_extra : {},
    creada_por: fila.creada_por === "taller" ? "taller" : "cliente",
    apuntada_por: miembro?.nombre ?? null,
    cancelada_por: fila.cancelada_por === "cliente" || fila.cancelada_por === "taller" ? fila.cancelada_por : null,
  }));
}

/** Miembros activos del taller, para "¿Quién la apunta?". Vacío si no tiene (entonces no se pregunta). */
export async function cargarMiembros(cliente: ClienteSupabase, tallerId: number): Promise<MiembroTaller[]> {
  const { data, error } = await cliente
    .from("miembros_taller")
    .select("id, nombre")
    .eq("taller_id", tallerId)
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error || !data) return [];
  return data;
}

/** Textos propios de WhatsApp del taller (modo enlace). Solo los lee el propio taller. */
export async function cargarTextosWhatsapp(cliente: ClienteSupabase, tallerId: number): Promise<TextosWhatsapp> {
  const { data, error } = await cliente
    .from("talleres")
    .select("texto_whatsapp_confirmacion, texto_whatsapp_cancelacion, texto_whatsapp_recordatorio, texto_whatsapp_listo")
    .eq("id", tallerId)
    .maybeSingle();
  if (error || !data) return TEXTOS_VACIOS;
  return {
    confirmacion: data.texto_whatsapp_confirmacion,
    cancelacion: data.texto_whatsapp_cancelacion,
    recordatorio: data.texto_whatsapp_recordatorio,
    listo: data.texto_whatsapp_listo,
  };
}

function esObjeto(valor: unknown): valor is Record<string, string | number> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
