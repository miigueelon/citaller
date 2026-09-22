import { supabasePublic } from "@/lib/supabase/client";
import type { Dia } from "@/lib/fechas";
import { agruparOcupacion, parsearMinimo, type Festivo, type Horario, type MinimoReserva, type Ocupacion } from "./disponibilidad";

// Lecturas públicas de la pantalla de reserva (rol anon; RLS y grants por columna en la BD).

export async function cargarHorarios(tallerId: number): Promise<Horario[]> {
  const { data, error } = await supabasePublic
    .from("horarios_taller")
    .select("dia_semana, hora, aviso_tarde")
    .eq("taller_id", tallerId)
    .order("hora");
  if (error) throw new Error(`Error cargando horarios: ${error.message}`);
  return data ?? [];
}

export async function cargarFestivos(tallerId: number): Promise<Festivo[]> {
  const { data, error } = await supabasePublic.from("festivos_taller").select("fecha, nombre").eq("taller_id", tallerId).order("fecha");
  if (error) throw new Error(`Error cargando festivos: ${error.message}`);
  return data ?? [];
}

/** Recuentos de reservas activas por hora de un día (RPC `ocupacion_dia`, sin datos personales). */
export async function cargarOcupacion(tallerId: number, dia: Dia): Promise<Ocupacion> {
  const { data, error } = await supabasePublic.rpc("ocupacion_dia", { p_taller_id: tallerId, p_dia: dia });
  if (error) throw new Error(`Error cargando la ocupación del día: ${error.message}`);
  return agruparOcupacion(data ?? []);
}

/**
 * Primera hora reservable ahora mismo para un servicio con antelación (RPC `antelacion_minima`,
 * calculada con la hora del servidor). null si el servicio no tiene antelación.
 */
export async function cargarAntelacionMinima(tallerId: number, servicioId: number): Promise<MinimoReserva | null> {
  const { data, error } = await supabasePublic.rpc("antelacion_minima", { p_taller_id: tallerId, p_servicio_id: servicioId });
  if (error) throw new Error(`Error comprobando la antelación del servicio: ${error.message}`);
  return parsearMinimo(data);
}
