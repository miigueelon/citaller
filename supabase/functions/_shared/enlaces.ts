import { urlApp } from "./origenes.ts";

/** Enlace de la cita para el cliente: ver y cancelar hasta 24 h antes. */
export function urlCitaCliente(slug: string, token: string): string {
  return `${urlApp()}/${slug}/cita/${token}`;
}

/** Sufijo para el botón de URL de la plantilla de WhatsApp (la base la lleva la plantilla). */
export function sufijoCitaCliente(slug: string, token: string): string {
  return `${slug}/cita/${token}`;
}
