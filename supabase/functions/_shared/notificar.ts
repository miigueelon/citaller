import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { borrarEventoDeReserva, crearEventoDeReserva, type ResultadoBorrado, type ResultadoCalendario } from "./calendario.ts";
import { sufijoCitaCliente, urlCitaCliente } from "./enlaces.ts";
import type { ReservaCompleta, TallerCompleto } from "./reservas.ts";
import {
  CONFIRMACION_CON_ENLACE,
  enviarPlantilla,
  ErrorWhatsapp,
  parametrosCancelacion,
  parametrosConfirmacion,
  PLANTILLAS,
  type DatosMensaje,
} from "./whatsapp.ts";

// Qué pasa después de confirmar, crear o cancelar una cita: WhatsApp según el modo del taller y
// Google Calendar si está conectado. Cada fallo se registra en la reserva y se devuelve al panel.

export interface ResultadoWhatsapp {
  modo: "api" | "enlace" | "ninguno";
  enviado: boolean;
  motivo?: "sin_telefono" | "ya_enviado" | "enlace" | "desactivado";
  error?: string;
}

export interface Notificaciones {
  whatsapp: ResultadoWhatsapp;
  calendario: ResultadoCalendario | ResultadoBorrado;
}

function datosMensaje(reserva: ReservaCompleta, taller: TallerCompleto): DatosMensaje {
  return {
    nombre: reserva.nombre ?? "",
    taller: taller.nombre,
    dia: reserva.dia,
    hora: reserva.hora,
    vehiculo: reserva.vehiculo ?? "",
    servicio: reserva.servicio ?? "",
    matricula: reserva.matricula ?? "",
    enlaceCita: urlCitaCliente(taller.slug, reserva.token_publico),
  };
}

type TipoMensaje = "confirmacion" | "cancelacion";

async function enviarWhatsapp(admin: SupabaseClient, reserva: ReservaCompleta, taller: TallerCompleto, tipo: TipoMensaje): Promise<ResultadoWhatsapp> {
  const modo = taller.whatsapp_modo;
  if (modo === "ninguno") return { modo, enviado: false, motivo: "desactivado" };
  if (modo === "enlace") return { modo, enviado: false, motivo: "enlace" };
  if (!reserva.telefono) return { modo, enviado: false, motivo: "sin_telefono" };

  const yaEnviado = tipo === "confirmacion" ? reserva.whatsapp_confirmacion_enviada : reserva.whatsapp_cancelacion_enviada;
  if (yaEnviado) return { modo, enviado: false, motivo: "ya_enviado" };

  const datos = datosMensaje(reserva, taller);
  try {
    if (tipo === "confirmacion") {
      await enviarPlantilla(taller, reserva.telefono, PLANTILLAS.confirmacion, parametrosConfirmacion(datos), {
        botonUrl: CONFIRMACION_CON_ENLACE ? sufijoCitaCliente(taller.slug, reserva.token_publico) : undefined,
      });
      await admin
        .from("reservas")
        .update({ whatsapp_confirmacion_enviada: true, whatsapp_confirmacion_fecha: new Date().toISOString(), whatsapp_error: null })
        .eq("id", reserva.id);
    } else {
      await enviarPlantilla(taller, reserva.telefono, PLANTILLAS.cancelacion, parametrosCancelacion(datos));
      await admin
        .from("reservas")
        .update({ whatsapp_cancelacion_enviada: true, whatsapp_cancelacion_fecha: new Date().toISOString(), whatsapp_error: null })
        .eq("id", reserva.id);
    }
    return { modo, enviado: true };
  } catch (fallo) {
    const mensaje = fallo instanceof ErrorWhatsapp ? fallo.message : fallo instanceof Error ? fallo.message : "Error enviando WhatsApp";
    console.error(`whatsapp (${tipo}):`, fallo instanceof ErrorWhatsapp ? fallo.detalle : fallo);
    await admin.from("reservas").update({ whatsapp_error: mensaje }).eq("id", reserva.id);
    return { modo, enviado: false, error: mensaje };
  }
}

/** Tras confirmar (o crear confirmada): WhatsApp de confirmación y evento en Calendar. */
export async function trasConfirmar(admin: SupabaseClient, reserva: ReservaCompleta, taller: TallerCompleto): Promise<Notificaciones> {
  const whatsapp = await enviarWhatsapp(admin, reserva, taller, "confirmacion");
  const calendario = await crearEventoDeReserva(admin, reserva);
  return { whatsapp, calendario };
}

/** Tras cancelar: WhatsApp de cancelación (si avisa el taller) y borrado del evento a mejor esfuerzo. */
export async function trasCancelar(
  admin: SupabaseClient,
  reserva: ReservaCompleta,
  taller: TallerCompleto,
  opciones: { avisarCliente: boolean },
): Promise<Notificaciones> {
  const whatsapp = opciones.avisarCliente
    ? await enviarWhatsapp(admin, reserva, taller, "cancelacion")
    : { modo: taller.whatsapp_modo, enviado: false, motivo: "desactivado" as const };
  const calendario = await borrarEventoDeReserva(admin, reserva);
  return { whatsapp, calendario };
}
