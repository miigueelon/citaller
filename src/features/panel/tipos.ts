export type EstadoReserva = "Pendiente" | "Confirmada" | "Cancelada";

/** Columnas de `reservas` que carga el panel. */
export interface ReservaPanel {
  id: number;
  taller_id: number;
  nombre: string | null;
  matricula: string | null;
  vehiculo: string | null;
  servicio: string | null;
  descripcion: string | null;
  kilometros: number | null;
  estado: EstadoReserva;
  /** "YYYY-MM-DD" */
  dia: string;
  /** "HH:MM:SS" */
  hora: string;
}

export type FiltroEstado = EstadoReserva;
export type FiltroFecha = "todas" | "hoy" | "manana" | "7dias";

export function esEstadoReserva(valor: string | null): valor is EstadoReserva {
  return valor === "Pendiente" || valor === "Confirmada" || valor === "Cancelada";
}
