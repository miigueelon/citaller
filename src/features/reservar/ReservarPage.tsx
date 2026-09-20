import { useState } from "react";
import { useTaller } from "@/app/providers/useTaller";
import { supabasePublic } from "@/lib/supabase/client";
import { esNeumaticosConMedidas, tallerPideKilometros } from "@/features/taller/configTemporal";
import { reservaVacia, type ReservaEnCurso } from "./tipos";
import { Confirmacion } from "./pasos/Confirmacion";
import ReservaForm from "@/components/ReservaForm";
import FechaHora from "@/components/FechaHora";

type Paso = 1 | 2 | 3;

/**
 * Flujo público de reserva: datos → fecha y hora → resumen y envío.
 * Si cambia el taller (otra URL), el proveedor del taller se remonta y este estado empieza de cero.
 */
export function ReservarPage() {
  const taller = useTaller();
  const [paso, setPaso] = useState<Paso>(1);
  const [reserva, setReserva] = useState<ReservaEnCurso>(() => reservaVacia(taller.id));

  async function guardarReserva(): Promise<boolean> {
    const kilometros =
      tallerPideKilometros(reserva.taller_id) && reserva.kilometros.trim() !== "" ? Number(reserva.kilometros) : null;

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

  if (paso === 1) {
    return <ReservaForm reserva={reserva} setReserva={setReserva} continuar={() => setPaso(2)} />;
  }

  if (paso === 2) {
    return <FechaHora reserva={reserva} setReserva={setReserva} volver={() => setPaso(1)} continuar={() => setPaso(3)} />;
  }

  return (
    <Confirmacion
      reserva={reserva}
      guardarReserva={guardarReserva}
      volverMenu={() => {
        setReserva(reservaVacia(taller.id));
        setPaso(1);
      }}
    />
  );
}
