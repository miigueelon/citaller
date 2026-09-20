import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { ClienteSupabase } from "@/lib/supabase/client";
import { EDGE_FUNCTIONS, esUrlDeGoogle, type RespuestaFuncion } from "@/features/integraciones/edgeFunctions";

export interface MensajePanel {
  tipo: "ok" | "error";
  texto: string;
}

function mensajeDeVuelta(params: URLSearchParams): MensajePanel | null {
  const resultado = params.get("calendar");
  if (!resultado) return null;
  if (resultado === "connected") return { tipo: "ok", texto: "Google Calendar conectado correctamente." };

  const motivo = params.get("motivo");
  console.error("Google Calendar no se conectó:", motivo);
  return {
    tipo: "error",
    texto:
      motivo === "access_denied"
        ? "No se conectó Google Calendar: no diste permiso a CiTaller."
        : "No se pudo conectar Google Calendar. Vuelve a intentarlo.",
  };
}

/**
 * Botón "Conectar Google Calendar" y la vuelta de Google (`?calendar=connected|error&motivo=…`).
 * El mensaje de vuelta se muestra una vez y los parámetros se quitan de la URL.
 */
export function useConexionGoogle(cliente: ClienteSupabase, tallerId: number, slug: string) {
  const [params, setParams] = useSearchParams();
  // El mensaje de vuelta de Google se lee una sola vez, al montar; después se quitan los parámetros
  // de la URL para que no se repita al recargar.
  const [mensaje, setMensaje] = useState<MensajePanel | null>(() => mensajeDeVuelta(params));

  useEffect(() => {
    if (!params.has("calendar")) return;
    const resto = new URLSearchParams(params);
    resto.delete("calendar");
    resto.delete("motivo");
    setParams(resto, { replace: true });
  }, [params, setParams]);

  const conectar = useCallback(async () => {
    try {
      const { data, error } = await cliente.functions.invoke<RespuestaFuncion>(EDGE_FUNCTIONS.conectarGoogleCalendar, {
        body: {
          taller_id: tallerId,
          // A dónde debe devolvernos Google al terminar (la función valida el origen).
          volver_a: `${window.location.origin}/${slug}/panel`,
        },
      });

      if (error) {
        console.error("Error conectando Google Calendar:", error);
        setMensaje({ tipo: "error", texto: "No se pudo iniciar la conexión con Google Calendar." });
        return;
      }
      if (!data?.ok || !data.auth_url) {
        console.error("Respuesta inesperada de Google Calendar:", data);
        setMensaje({ tipo: "error", texto: "No se pudo obtener el enlace de autorización de Google." });
        return;
      }
      // Nunca seguir un enlace de autorización que no sea de Google.
      if (!esUrlDeGoogle(data.auth_url)) {
        console.error("auth_url inesperada:", data.auth_url);
        setMensaje({ tipo: "error", texto: "El enlace de autorización recibido no es de Google." });
        return;
      }
      window.location.href = data.auth_url;
    } catch (fallo: unknown) {
      console.error("Error conectando Google Calendar:", fallo);
      setMensaje({ tipo: "error", texto: "Ocurrió un error al conectar Google Calendar." });
    }
  }, [cliente, tallerId, slug]);

  return { conectar, mensaje, cerrarMensaje: () => setMensaje(null) };
}
