import { useCallback, useEffect, useState } from "react";
import type { ClienteSupabase } from "@/lib/supabase/client";
import { EDGE_FUNCTIONS, type RespuestaFuncion } from "@/features/integraciones/edgeFunctions";
import { actualizarEstado, cargarReservasTaller } from "./api";
import type { EstadoReserva, ReservaPanel } from "./tipos";

export interface ResultadoCambio {
  ok: boolean;
  /** Mensajes para la persona del taller (errores o avisos de WhatsApp y Calendar). */
  avisos: string[];
}

/** Reservas del taller y las dos acciones del panel: recargar y cambiar de estado. */
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

  /**
   * Confirma o cancela. Primero el cambio de estado; solo si la base de datos lo acepta se avisa a
   * WhatsApp y a Google Calendar. (En la fase 3.3 pasa a una sola Edge Function por acción.)
   */
  const cambiarEstado = useCallback(
    async (reservaId: number, nuevoEstado: EstadoReserva): Promise<ResultadoCambio> => {
      const actual = reservas.find((reserva) => reserva.id === reservaId);
      const avisos: string[] = [];

      let filas: number;
      try {
        filas = await actualizarEstado(cliente, tallerId, reservaId, nuevoEstado);
      } catch (fallo: unknown) {
        console.error("Error actualizando reserva:", fallo);
        return { ok: false, avisos: ["No se pudo actualizar la reserva"] };
      }

      if (filas === 0) {
        console.warn("El cambio de estado no afectó a ninguna reserva:", reservaId, nuevoEstado);
        await recargar();
        return { ok: false, avisos: ["Esta cita ya no se puede cambiar. Si estaba cancelada, hay que crear una cita nueva."] };
      }

      // Cancelar una confirmada: borrar su evento de Google (mejor esfuerzo, la cita ya está cancelada).
      if (nuevoEstado === "Cancelada" && actual?.estado === "Confirmada") {
        try {
          const { data, error } = await cliente.functions.invoke<RespuestaFuncion>(EDGE_FUNCTIONS.cancelarEventoGoogle, { body: { reserva_id: reservaId } });
          if (error || !data?.ok) console.error("La cita se canceló, pero falló la llamada a Google Calendar:", error ?? data);
          else if (data.aviso) avisos.push(`La cita está cancelada. ${data.aviso}.`);
        } catch (fallo: unknown) {
          console.error("La cita se canceló, pero ocurrió un error con Google Calendar:", fallo);
        }
      }

      if (nuevoEstado === "Confirmada") {
        try {
          const { data, error } = await cliente.functions.invoke<RespuestaFuncion>(EDGE_FUNCTIONS.enviarWhatsappConfirmacion, { body: { reserva_id: reservaId } });
          if (error) console.error("La reserva se confirmó, pero falló la llamada a WhatsApp:", error);
          else console.log("Respuesta WhatsApp:", data);
        } catch (fallo: unknown) {
          console.error("La reserva se confirmó, pero ocurrió un error con WhatsApp:", fallo);
        }

        // La función responde con un error claro si el taller no tiene Google conectado.
        try {
          const { data, error } = await cliente.functions.invoke<RespuestaFuncion>(EDGE_FUNCTIONS.crearEventoGoogle, { body: { reserva_id: reservaId } });
          if (error) console.error("La reserva se confirmó, pero falló Google Calendar:", error);
          else console.log("Respuesta Google Calendar:", data);
        } catch (fallo: unknown) {
          console.error("La reserva se confirmó, pero ocurrió un error con Google Calendar:", fallo);
        }
      }

      await recargar();
      return { ok: true, avisos };
    },
    [cliente, tallerId, reservas, recargar],
  );

  return { reservas, cargando, error, recargar, cambiarEstado };
}
