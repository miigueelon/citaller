import { useTaller } from "@/app/providers/useTaller";
import { supabasePublic } from "@/lib/supabase/client";
import { esNeumaticosConMedidas, tallerPideKilometros } from "@/features/taller/configTemporal";
import { useReservaWizard } from "./useReservaWizard";
import type { ReservaEnCurso } from "./tipos";
import { DatosForm } from "./pasos/DatosForm";
import { FechaHora } from "./pasos/FechaHora";
import { Confirmacion } from "./pasos/Confirmacion";
import "./reservar.css";

/** Guarda la solicitud con la RPC pública. Devuelve true si se creó. */
async function guardarReserva(reserva: ReservaEnCurso): Promise<boolean> {
  const kilometros = tallerPideKilometros(reserva.taller_id) && reserva.kilometros.trim() !== "" ? Number(reserva.kilometros) : null;

  const descripcion = esNeumaticosConMedidas(reserva.taller_id, reserva.servicio)
    ? `${reserva.cantidad_neumaticos || ""} neumático${reserva.cantidad_neumaticos === "1" ? "" : "s"} · Medidas: ${
        reserva.descripcion.trim() || "No indicadas"
      }`
    : reserva.descripcion || null;

  const { error } = await supabasePublic.rpc("crear_reserva_publica", {
    p_taller_id: reserva.taller_id,
    p_matricula: reserva.matricula,
    p_nombre: reserva.nombre,
    p_telefono: reserva.telefono,
    p_vehiculo: reserva.vehiculo,
    p_servicio: reserva.servicio,
    // La RPC acepta null; los tipos generados no lo reflejan. Se sustituye por la v2 en la fase 3.1.
    p_descripcion: descripcion as string,
    p_dia: reserva.dia,
    p_hora: reserva.hora,
    p_kilometros: kilometros ?? undefined,
  });

  if (error) {
    console.error("Error guardando reserva:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
    alert(error.message);
    return false;
  }
  return true;
}

/**
 * Flujo público de reserva: datos → fecha y hora → resumen y envío.
 * Si cambia el taller (otra URL), el proveedor del taller se remonta y este estado empieza de cero.
 */
export function ReservarPage() {
  const taller = useTaller();
  const { paso, setPaso, reserva, actualizar, reiniciar } = useReservaWizard(taller.id);

  if (paso === 1) return <DatosForm reserva={reserva} actualizar={actualizar} continuar={() => setPaso(2)} />;

  if (paso === 2) return <FechaHora reserva={reserva} actualizar={actualizar} volver={() => setPaso(1)} continuar={() => setPaso(3)} />;

  return <Confirmacion reserva={reserva} guardarReserva={() => guardarReserva(reserva)} volverMenu={reiniciar} />;
}
