import type { ClienteSupabase } from "@/lib/supabase/client";
import { esEstadoReserva, type EstadoReserva, type ReservaPanel } from "./tipos";

/** Reservas del taller, ordenadas por día y hora. La RLS garantiza que solo llegan las suyas. */
export async function cargarReservasTaller(cliente: ClienteSupabase, tallerId: number): Promise<ReservaPanel[]> {
  const { data, error } = await cliente
    .from("reservas")
    .select("id, taller_id, nombre, telefono, matricula, vehiculo, servicio, descripcion, kilometros, estado, dia, hora")
    .eq("taller_id", tallerId)
    .order("dia", { ascending: true })
    .order("hora", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((fila) => ({
    ...fila,
    estado: esEstadoReserva(fila.estado) ? fila.estado : "Pendiente",
  }));
}

/**
 * Cambia el estado de una reserva del taller. Devuelve cuántas filas cambiaron: 0 significa que la
 * base de datos lo rechazó (por ejemplo, una cita cancelada no se reabre).
 */
export async function actualizarEstado(cliente: ClienteSupabase, tallerId: number, reservaId: number, estado: EstadoReserva): Promise<number> {
  const { data, error } = await cliente.from("reservas").update({ estado }).eq("id", reservaId).eq("taller_id", tallerId).select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
