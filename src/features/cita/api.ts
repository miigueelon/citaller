import { supabasePublic } from "@/lib/supabase/client";
import { mensajeDeError } from "@/lib/erroresDominio";
import { EDGE_FUNCTIONS, type RespuestaFuncion } from "@/features/integraciones/edgeFunctions";

/** Lo que la página del cliente sabe de su cita. Nunca incluye su teléfono. */
export interface CitaCliente {
  taller_nombre: string;
  taller_slug: string;
  taller_telefono: string | null;
  nombre: string | null;
  vehiculo: string | null;
  matricula: string | null;
  servicio: string | null;
  dia: string;
  hora: string;
  estado: "Pendiente" | "Confirmada" | "Cancelada";
  cancelada_por: "cliente" | "taller" | null;
  puede_cancelar: boolean;
  /** Hasta cuándo se puede cancelar por internet (ISO). */
  limite_cancelacion: string | null;
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esTokenValido(token: string): boolean {
  return PATRON_UUID.test(token);
}

/** Datos mínimos de la cita por su token. `null` si no existe. */
export async function consultarCita(token: string): Promise<CitaCliente | null> {
  const { data, error } = await supabasePublic.rpc("consultar_cita_cliente", { p_token: token });
  if (error) throw new Error(error.message);
  const fila = Array.isArray(data) ? data[0] : null;
  if (!fila || !fila.taller_nombre || !fila.dia || !fila.hora) return null;
  return {
    taller_nombre: fila.taller_nombre,
    taller_slug: fila.taller_slug ?? "",
    taller_telefono: fila.taller_telefono,
    nombre: fila.nombre,
    vehiculo: fila.vehiculo,
    matricula: fila.matricula,
    servicio: fila.servicio,
    dia: fila.dia,
    hora: fila.hora,
    estado: fila.estado === "Confirmada" || fila.estado === "Cancelada" ? fila.estado : "Pendiente",
    cancelada_por: fila.cancelada_por === "cliente" || fila.cancelada_por === "taller" ? fila.cancelada_por : null,
    puede_cancelar: fila.puede_cancelar === true,
    limite_cancelacion: fila.limite_cancelacion,
  };
}

/** Cancela la cita por su token. Devuelve null si se canceló, o el mensaje de error. */
export async function cancelarCita(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabasePublic.functions.invoke<RespuestaFuncion>(EDGE_FUNCTIONS.cancelarCitaCliente, { body: { token } });
    if (!error && data?.ok) return null;

    const contexto = (error as { context?: Response } | null)?.context;
    if (contexto instanceof Response) {
      const cuerpo = (await contexto.clone().json().catch(() => null)) as RespuestaFuncion | null;
      if (cuerpo?.codigo === "no_encontrada") return mensajeDeError({ code: "CT010" });
      if (cuerpo?.codigo === "fuera_de_plazo") return mensajeDeError({ code: "CT011" });
      if (cuerpo?.codigo === "ya_cancelada") return mensajeDeError({ code: "CT012" });
      if (cuerpo?.error) return cuerpo.error;
    }
    console.error("cancelar-cita-cliente:", error ?? data);
    return "No se pudo cancelar la cita. Inténtalo de nuevo o llama al taller.";
  } catch (fallo: unknown) {
    console.error("cancelar-cita-cliente:", fallo);
    return "No se pudo cancelar la cita. Inténtalo de nuevo o llama al taller.";
  }
}
