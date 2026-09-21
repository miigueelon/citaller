export type EstadoReserva = "Pendiente" | "Confirmada" | "Cancelada";

/** Columnas de `reservas` que carga el panel. */
export interface ReservaPanel {
  id: number;
  taller_id: number;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  servicio: string | null;
  descripcion: string | null;
  /** Valores de los campos extra del taller, por clave. */
  datos_extra: Record<string, string | number>;
  estado: EstadoReserva;
  /** "YYYY-MM-DD" */
  dia: string;
  /** "HH:MM:SS" */
  hora: string;
  creada_por: "cliente" | "taller";
  /** Nombre del miembro del taller que la apuntó a mano, si el taller tiene miembros. */
  apuntada_por: string | null;
  cancelada_por: "cliente" | "taller" | null;
  cancelada_en: string | null;
  confirmada_en: string | null;
  /** Enlace de la cita para el cliente: /<slug>/cita/<token>. */
  token_publico: string;
  whatsapp_confirmacion_enviada: boolean;
  whatsapp_cancelacion_enviada: boolean;
  whatsapp_error: string | null;
  google_event_id: string | null;
  google_error: string | null;
}

/** Persona del taller que puede apuntar citas a mano (tabla `miembros_taller`, solo las activas). */
export interface MiembroTaller {
  id: number;
  nombre: string;
}

export type FiltroEstado = EstadoReserva;
export type FiltroFecha = "todas" | "hoy" | "manana" | "7dias";

export function esEstadoReserva(valor: string | null): valor is EstadoReserva {
  return valor === "Pendiente" || valor === "Confirmada" || valor === "Cancelada";
}
