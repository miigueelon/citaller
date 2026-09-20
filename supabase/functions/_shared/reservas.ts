import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ModoWhatsapp } from "./whatsapp.ts";

// Lectura de reservas y talleres con la clave de servicio. Único sitio que conoce las columnas.

export interface ReservaCompleta {
  id: number;
  taller_id: number;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  servicio: string | null;
  descripcion: string | null;
  dia: string;
  hora: string;
  estado: "Pendiente" | "Confirmada" | "Cancelada";
  datos_extra: Record<string, unknown>;
  token_publico: string;
  creada_por: "cliente" | "taller";
  google_event_id: string | null;
  whatsapp_confirmacion_enviada: boolean;
  whatsapp_cancelacion_enviada: boolean;
}

export interface TallerCompleto {
  id: number;
  nombre: string;
  slug: string;
  telefono: string | null;
  whatsapp_modo: ModoWhatsapp;
  whatsapp_phone_number_id: string | null;
}

const COLUMNAS_RESERVA =
  "id, taller_id, nombre, telefono, matricula, vehiculo, servicio, descripcion, dia, hora, estado, datos_extra, token_publico, creada_por, google_event_id, whatsapp_confirmacion_enviada, whatsapp_cancelacion_enviada";

export async function leerReserva(admin: SupabaseClient, reservaId: number): Promise<ReservaCompleta | null> {
  const { data, error } = await admin.from("reservas").select(COLUMNAS_RESERVA).eq("id", reservaId).maybeSingle();
  if (error) throw new Error(`leerReserva: ${error.message}`);
  return (data as ReservaCompleta | null) ?? null;
}

export async function leerTaller(admin: SupabaseClient, tallerId: number): Promise<TallerCompleto | null> {
  const { data, error } = await admin
    .from("talleres")
    .select("id, nombre, slug, telefono, whatsapp_modo, whatsapp_phone_number_id")
    .eq("id", tallerId)
    .maybeSingle();
  if (error) throw new Error(`leerTaller: ${error.message}`);
  return (data as TallerCompleto | null) ?? null;
}

/** Etiquetas de los campos extra del taller, para describir la cita en Calendar. */
export async function leerEtiquetasCampos(admin: SupabaseClient, tallerId: number): Promise<Record<string, { etiqueta: string; unidad: string | null }>> {
  const { data, error } = await admin.from("campos_formulario_taller").select("clave, etiqueta, unidad").eq("taller_id", tallerId);
  if (error) throw new Error(`leerEtiquetasCampos: ${error.message}`);
  const mapa: Record<string, { etiqueta: string; unidad: string | null }> = {};
  for (const fila of (data ?? []) as Array<{ clave: string; etiqueta: string; unidad: string | null }>) {
    mapa[fila.clave] = { etiqueta: fila.etiqueta.replace(/\s*\(opcional\)/i, ""), unidad: fila.unidad };
  }
  return mapa;
}
