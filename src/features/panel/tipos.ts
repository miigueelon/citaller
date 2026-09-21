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
  /** Cuándo se pulsó "Vehículo listo" por última vez (ISO). Null = cita por terminar. */
  listo_en: string | null;
  /** Enlace de la cita para el cliente: /<slug>/cita/<token>. */
  token_publico: string;
  /** Avisos de WhatsApp ya mandados (por la API o, en modo enlace, al pulsar el botón) y cuándo. */
  whatsapp_confirmacion_enviada: boolean;
  whatsapp_confirmacion_fecha: string | null;
  whatsapp_cancelacion_enviada: boolean;
  whatsapp_cancelacion_fecha: string | null;
  whatsapp_recordatorio_enviado: boolean;
  whatsapp_recordatorio_fecha: string | null;
  whatsapp_error: string | null;
  google_event_id: string | null;
  google_error: string | null;
}

/** Persona del taller que puede apuntar citas a mano (tabla `miembros_taller`, solo las activas). */
export interface MiembroTaller {
  id: number;
  nombre: string;
}

/** Avisos por WhatsApp que quedan apuntados en la cita ("Vehículo listo" va aparte, en `listo_en`). */
export type TipoAviso = "confirmacion" | "cancelacion" | "recordatorio";

export type FiltroEstado = EstadoReserva;
export type FiltroFecha = "todas" | "hoy" | "manana" | "7dias";

export function esEstadoReserva(valor: string | null): valor is EstadoReserva {
  return valor === "Pendiente" || valor === "Confirmada" || valor === "Cancelada";
}
