import { useState } from "react";
import { useTaller } from "@/app/providers/useTaller";
import { supabasePublic } from "@/lib/supabase/client";
import { mensajeDeError } from "@/lib/erroresDominio";
import { useReservaWizard } from "./useReservaWizard";
import { normalizarMatricula } from "./validacion";
import type { ReservaEnCurso } from "./tipos";
import { DatosForm } from "./pasos/DatosForm";
import { FechaHora } from "./pasos/FechaHora";
import { Resumen } from "./pasos/Resumen";
import { ReservaConfirmada } from "./pasos/ReservaConfirmada";
import "./reservar.css";

interface ReservaCreada {
  id: number;
  token: string;
}

/** Guarda la solicitud con la RPC pública v2. Devuelve la reserva creada o el mensaje de error. */
async function guardarReserva(reserva: ReservaEnCurso): Promise<{ creada: ReservaCreada } | { error: string }> {
  const { data, error } = await supabasePublic.rpc("crear_reserva_publica", {
    p_taller_id: reserva.taller_id,
    p_matricula: normalizarMatricula(reserva.matricula),
    p_nombre: reserva.nombre.trim(),
    p_telefono: reserva.telefono.trim(),
    p_vehiculo: reserva.vehiculo.trim(),
    p_servicio: reserva.servicio,
    p_descripcion: reserva.descripcion.trim(),
    p_dia: reserva.dia,
    p_hora: reserva.hora,
    p_datos_extra: reserva.datos_extra,
  });

  if (error) {
    console.error("Error guardando reserva:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
    return { error: mensajeDeError(error) };
  }

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila || typeof fila.reserva_id !== "number" || typeof fila.token_publico !== "string") {
    console.error("Respuesta inesperada de crear_reserva_publica:", data);
    return { error: mensajeDeError(null) };
  }
  return { creada: { id: fila.reserva_id, token: fila.token_publico } };
}

/**
 * Flujo público de reserva: datos → fecha y hora → resumen → enviada.
 * Si cambia el taller (otra URL), el proveedor del taller se remonta y este estado empieza de cero.
 */
export function ReservarPage() {
  const taller = useTaller();
  const { paso, setPaso, reserva, actualizar, reiniciar } = useReservaWizard(taller.id);
  const [creada, setCreada] = useState<ReservaCreada | null>(null);

  if (paso === 1) return <DatosForm reserva={reserva} actualizar={actualizar} continuar={() => setPaso(2)} />;

  if (paso === 2) return <FechaHora reserva={reserva} actualizar={actualizar} volver={() => setPaso(1)} continuar={() => setPaso(3)} />;

  if (paso === 3 || !creada) {
    return (
      <Resumen
        reserva={reserva}
        volver={() => setPaso(2)}
        enviar={async () => {
          const resultado = await guardarReserva(reserva);
          if ("error" in resultado) return resultado.error;
          setCreada(resultado.creada);
          setPaso(4);
          return null;
        }}
      />
    );
  }

  return (
    <ReservaConfirmada
      reserva={reserva}
      enlaceCita={`${window.location.origin}/${taller.slug}/cita/${creada.token}`}
      otraReserva={() => {
        setCreada(null);
        reiniciar();
      }}
    />
  );
}
