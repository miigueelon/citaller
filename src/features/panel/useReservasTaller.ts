import { useCallback, useEffect, useState } from "react";
import type { ClienteSupabase } from "@/lib/supabase/client";
import { mensajeDeError } from "@/lib/erroresDominio";
import { EDGE_FUNCTIONS, type RespuestaFuncion, type ResultadoNotificaciones } from "@/features/integraciones/edgeFunctions";
import { cargarReservasTaller } from "./api";
import type { ReservaPanel } from "./tipos";

export interface ResultadoAccion {
  ok: boolean;
  /** Lo que ha ido bien: primero la acción ("Cita confirmada."), después sus notificaciones. */
  logros: string[];
  /** Lo que ha fallado o queda pendiente; el panel lo enseña con botón de reintentar. */
  avisos: string[];
  /** La reserva afectada, cuando la acción la creó o la cambió. */
  reservaId?: number;
  /** Token del enlace de la cita (solo al crearla a mano). */
  tokenPublico?: string;
}

/** Datos de una cita apuntada a mano desde el panel. */
export interface DatosCitaManual {
  nombre: string;
  telefono: string;
  matricula: string;
  vehiculo: string;
  servicio: string;
  descripcion: string;
  dia: string;
  hora: string;
  datos_extra: Record<string, string>;
}

/** Traduce el resultado de las notificaciones a frases para la persona del taller. */
export function describirNotificaciones(n: ResultadoNotificaciones | undefined, accion: "confirmar" | "cancelar"): Pick<ResultadoAccion, "logros" | "avisos"> {
  const logros: string[] = [];
  const avisos: string[] = [];
  if (!n) return { logros, avisos };

  const { whatsapp, calendario } = n;
  if (whatsapp.modo === "api") {
    if (whatsapp.enviado) logros.push(accion === "confirmar" ? "WhatsApp de confirmación enviado al cliente." : "WhatsApp de cancelación enviado al cliente.");
    else if (whatsapp.error) avisos.push(`No se pudo enviar el WhatsApp: ${whatsapp.error}. Avisa al cliente por otro medio o vuelve a pulsar para reintentar.`);
    else if (whatsapp.motivo === "sin_telefono") avisos.push("La cita no tiene teléfono: no se ha enviado WhatsApp.");
  }

  if (calendario.error) {
    avisos.push(`Google Calendar: ${calendario.error}`);
  } else if (calendario.creado) {
    logros.push("Evento creado en Google Calendar.");
  } else if (calendario.borrado) {
    logros.push("Evento eliminado de Google Calendar.");
  }

  return { logros, avisos };
}

/** Mensaje de error de una Edge Function (cuerpo JSON de un 4xx/5xx o error de red). */
async function mensajeDeFallo(error: unknown, generico: string): Promise<string> {
  const contexto = (error as { context?: Response })?.context;
  if (contexto instanceof Response) {
    try {
      const cuerpo = (await contexto.clone().json()) as RespuestaFuncion;
      if (cuerpo.codigo?.startsWith("CT")) return mensajeDeError({ code: cuerpo.codigo, message: cuerpo.error });
      if (cuerpo.error) return cuerpo.error;
    } catch {
      /* sin cuerpo JSON */
    }
  }
  return generico;
}

/** Reservas del taller y sus acciones: recargar, confirmar, cancelar y apuntar una cita a mano. */
export function useReservasTaller(cliente: ClienteSupabase, tallerId: number) {
  const [reservas, setReservas] = useState<ReservaPanel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setReservas(await cargarReservasTaller(cliente, tallerId));
    } catch (fallo: unknown) {
      console.error("Error cargando reservas:", fallo);
      setError(fallo instanceof Error ? fallo.message : "Error desconocido");
      setReservas([]);
    } finally {
      setCargando(false);
    }
  }, [cliente, tallerId]);

  useEffect(() => {
    let vigente = true;
    cargarReservasTaller(cliente, tallerId)
      .then((datos) => {
        if (vigente) setReservas(datos);
      })
      .catch((fallo: unknown) => {
        console.error("Error cargando reservas:", fallo);
        if (vigente) {
          setError(fallo instanceof Error ? fallo.message : "Error desconocido");
          setReservas([]);
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, tallerId]);

  /** Una sola Edge Function por acción: cambia el estado y notifica (WhatsApp según modo, Calendar). */
  const invocar = useCallback(
    async (nombre: string, body: Record<string, unknown>, accion: "confirmar" | "cancelar", exito: string, generico: string): Promise<ResultadoAccion> => {
      try {
        const { data, error: fallo } = await cliente.functions.invoke<RespuestaFuncion>(nombre, { body });
        if (fallo || !data?.ok) {
          console.error(`${nombre}:`, fallo ?? data);
          const mensaje = fallo ? await mensajeDeFallo(fallo, generico) : (data?.error ?? generico);
          await recargar();
          return { ok: false, logros: [], avisos: [mensaje] };
        }
        await recargar();
        // El aviso empieza por lo que ha pasado con la cita; después, WhatsApp y Calendar.
        const { logros, avisos } = describirNotificaciones(data.notificaciones, accion);
        return { ok: true, reservaId: data.reserva_id, tokenPublico: data.token_publico, logros: [exito, ...logros], avisos };
      } catch (fallo: unknown) {
        console.error(`${nombre}:`, fallo);
        return { ok: false, logros: [], avisos: [generico] };
      }
    },
    [cliente, recargar],
  );

  const confirmar = useCallback(
    (reservaId: number) => invocar(EDGE_FUNCTIONS.confirmarReserva, { reserva_id: reservaId }, "confirmar", "Cita confirmada.", "No se pudo confirmar la cita. Inténtalo de nuevo."),
    [invocar],
  );

  const cancelar = useCallback(
    (reservaId: number) => invocar(EDGE_FUNCTIONS.cancelarReserva, { reserva_id: reservaId }, "cancelar", "Cita cancelada.", "No se pudo cancelar la cita. Inténtalo de nuevo."),
    [invocar],
  );

  const crearManual = useCallback(
    (datos: DatosCitaManual) =>
      invocar(EDGE_FUNCTIONS.crearReservaTaller, { taller_id: tallerId, ...datos }, "confirmar", "Cita confirmada y apuntada en la agenda.", "No se pudo guardar la cita. Revisa los datos e inténtalo de nuevo."),
    [invocar, tallerId],
  );

  return { reservas, cargando, error, recargar, confirmar, cancelar, crearManual };
}
