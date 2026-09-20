import { useTaller } from "@/app/providers/useTaller";
import { supabasePublic } from "@/lib/supabase/client";
import { mensajeDeError } from "@/lib/erroresDominio";
import { esNeumaticosConMedidas, tallerPideKilometros } from "@/features/taller/configTemporal";
import { useReservaWizard } from "./useReservaWizard";
import { normalizarMatricula } from "./validacion";
import type { ReservaEnCurso } from "./tipos";
import { DatosForm } from "./pasos/DatosForm";
import { FechaHora } from "./pasos/FechaHora";
import { Resumen } from "./pasos/Resumen";
import { ReservaConfirmada } from "./pasos/ReservaConfirmada";
import "./reservar.css";

/** Guarda la solicitud con la RPC pública. Devuelve null si se creó, o el mensaje de error. */
async function guardarReserva(reserva: ReservaEnCurso): Promise<string | null> {
  const kilometros = tallerPideKilometros(reserva.taller_id) && reserva.kilometros.trim() !== "" ? Number(reserva.kilometros) : null;

  const descripcion = esNeumaticosConMedidas(reserva.taller_id, reserva.servicio)
    ? `${reserva.cantidad_neumaticos || ""} neumático${reserva.cantidad_neumaticos === "1" ? "" : "s"} · Medidas: ${
        reserva.descripcion.trim() || "No indicadas"
      }`
    : reserva.descripcion.trim() || null;

  const { error } = await supabasePublic.rpc("crear_reserva_publica", {
    p_taller_id: reserva.taller_id,
    p_matricula: normalizarMatricula(reserva.matricula),
    p_nombre: reserva.nombre.trim(),
    p_telefono: reserva.telefono.trim(),
    p_vehiculo: reserva.vehiculo.trim(),
    p_servicio: reserva.servicio,
    // La RPC acepta null; los tipos generados no lo reflejan. Se sustituye por la v2 en la fase 3.1.
    p_descripcion: descripcion as string,
    p_dia: reserva.dia,
    p_hora: reserva.hora,
    p_kilometros: kilometros ?? undefined,
  });

  if (error) {
    console.error("Error guardando reserva:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
    return mensajeDeError(error);
  }
  return null;
}

/**
 * Flujo público de reserva: datos → fecha y hora → resumen → enviada.
 * Si cambia el taller (otra URL), el proveedor del taller se remonta y este estado empieza de cero.
 */
export function ReservarPage() {
  const taller = useTaller();
  const { paso, setPaso, reserva, actualizar, reiniciar } = useReservaWizard(taller.id);

  if (paso === 1) return <DatosForm reserva={reserva} actualizar={actualizar} continuar={() => setPaso(2)} />;

  if (paso === 2) return <FechaHora reserva={reserva} actualizar={actualizar} volver={() => setPaso(1)} continuar={() => setPaso(3)} />;

  if (paso === 3) {
    return (
      <Resumen
        reserva={reserva}
        volver={() => setPaso(2)}
        enviar={async () => {
          const error = await guardarReserva(reserva);
          if (!error) setPaso(4);
          return error;
        }}
      />
    );
  }

  return <ReservaConfirmada reserva={reserva} otraReserva={reiniciar} />;
}
