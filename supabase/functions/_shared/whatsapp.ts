// Envío de plantillas de WhatsApp por la Meta Cloud API. Solo se usa cuando el taller tiene
// whatsapp_modo = 'api'. En modo 'enlace' el panel abre wa.me con el texto ya escrito.

export type ModoWhatsapp = "api" | "enlace" | "ninguno";

export interface TallerWhatsapp {
  id: number;
  nombre: string;
  whatsapp_modo: ModoWhatsapp;
  whatsapp_phone_number_id: string | null;
}

export class ErrorWhatsapp extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
    readonly detalle?: unknown,
  ) {
    super(mensaje);
  }
}

/** Nombres de las plantillas aprobadas en Meta. Se pueden cambiar por secreto sin redesplegar. */
export const PLANTILLAS = {
  confirmacion: Deno.env.get("WHATSAPP_PLANTILLA_CONFIRMACION") ?? "confirmacion_cita",
  cancelacion: Deno.env.get("WHATSAPP_PLANTILLA_CANCELACION") ?? "cancelacion_cita",
  recordatorio: Deno.env.get("WHATSAPP_PLANTILLA_RECORDATORIO") ?? "recordatorio_cita",
} as const;

/** La plantilla de confirmación lleva botón de URL al enlace de la cita (solo la versión v2 aprobada con botón). */
export const CONFIRMACION_CON_ENLACE = (Deno.env.get("WHATSAPP_CONFIRMACION_CON_ENLACE") ?? "false") === "true";

/** Token permanente de Meta del taller. Hoy en Supabase Secrets; objetivo: Vault. */
export function tokenWhatsapp(tallerId: number): string | null {
  return Deno.env.get(`WHATSAPP_TOKEN_TALLER_${tallerId}`) ?? null;
}

/** "2026-09-21" → "lunes, 21 de septiembre". */
export function formatearDiaLargo(dia: string): string {
  const [anio, mes, diaMes] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(anio, mes - 1, diaMes, 12)),
  );
}

export function horaCorta(hora: string): string {
  return hora.substring(0, 5);
}

export interface DatosMensaje {
  nombre: string;
  taller: string;
  /** "YYYY-MM-DD" */
  dia: string;
  /** "HH:MM:SS" o "HH:MM" */
  hora: string;
  vehiculo: string;
  servicio: string;
  matricula: string;
  /** Enlace /<slug>/cita/<token>, para el botón de la plantilla. */
  enlaceCita: string;
}

/** Parámetros de la plantilla `confirmacion_cita` (7). */
export function parametrosConfirmacion(d: DatosMensaje): string[] {
  return [d.nombre, d.taller, formatearDiaLargo(d.dia), horaCorta(d.hora), d.vehiculo, d.servicio, d.matricula];
}

/** Parámetros de la plantilla `cancelacion_cita` (5). */
export function parametrosCancelacion(d: DatosMensaje): string[] {
  return [d.nombre, d.taller, formatearDiaLargo(d.dia), horaCorta(d.hora), d.servicio];
}

/** Parámetros de la plantilla `recordatorio_cita` (5). */
export function parametrosRecordatorio(d: DatosMensaje): string[] {
  return [d.nombre, d.taller, horaCorta(d.hora), d.vehiculo, d.servicio];
}

interface OpcionesEnvio {
  /** Sufijo dinámico del botón de URL de la plantilla (por ejemplo "rikandroll/cita/<token>"). */
  botonUrl?: string;
}

/**
 * Envía una plantilla al teléfono (ya normalizado por la base de datos: 34XXXXXXXXX).
 * Lanza ErrorWhatsapp si falta configuración o Meta rechaza el envío.
 */
export async function enviarPlantilla(
  taller: TallerWhatsapp,
  telefono: string,
  plantilla: string,
  parametros: string[],
  opciones: OpcionesEnvio = {},
): Promise<{ id: string | null }> {
  if (!taller.whatsapp_phone_number_id) throw new ErrorWhatsapp("El taller no tiene número de WhatsApp configurado", 500);
  const token = tokenWhatsapp(taller.id);
  if (!token) throw new ErrorWhatsapp(`Falta el secreto WHATSAPP_TOKEN_TALLER_${taller.id}`, 500);

  const version = Deno.env.get("META_GRAPH_VERSION") ?? "v23.0";
  const componentes: unknown[] = [{ type: "body", parameters: parametros.map((texto) => ({ type: "text", text: texto })) }];
  if (opciones.botonUrl) {
    componentes.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: opciones.botonUrl }] });
  }

  const respuesta = await fetch(`https://graph.facebook.com/${version}/${taller.whatsapp_phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "template",
      template: { name: plantilla, language: { code: "es" }, components: componentes },
    }),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = (datos as { error?: { message?: string } })?.error?.message;
    throw new ErrorWhatsapp(detalle ? `Meta rechazó el envío: ${detalle}` : "Meta rechazó el envío", respuesta.status, datos);
  }
  const id = (datos as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null;
  return { id };
}
