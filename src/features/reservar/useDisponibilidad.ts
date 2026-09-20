import { useEffect, useState } from "react";
import type { Dia } from "@/lib/fechas";
import { cargarFestivos, cargarHorarios, cargarOcupacion } from "./api";
import { OCUPACION_VACIA, type Festivo, type Horario, type Ocupacion } from "./disponibilidad";

interface OcupacionDeUnDia {
  dia: Dia;
  datos: Ocupacion;
}

/**
 * Carga horarios y festivos del taller una vez, y la ocupación cada vez que cambia el día.
 * La ocupación se guarda junto al día al que pertenece: si el cliente cambia de día antes de que
 * llegue la respuesta anterior, esa respuesta se descarta y nunca se muestra en el día equivocado.
 */
export function useDisponibilidad(tallerId: number, dia: Dia | "") {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);
  const [ocupacionCargada, setOcupacionCargada] = useState<OcupacionDeUnDia | null>(null);

  useEffect(() => {
    let vigente = true;

    cargarHorarios(tallerId)
      .then((datos) => {
        if (vigente) setHorarios(datos);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (vigente) setHorarios([]);
      })
      .finally(() => {
        if (vigente) setCargandoHorarios(false);
      });

    cargarFestivos(tallerId)
      .then((datos) => {
        if (vigente) setFestivos(datos);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (vigente) setFestivos([]);
      });

    return () => {
      vigente = false;
    };
  }, [tallerId]);

  useEffect(() => {
    if (!dia) return;
    let vigente = true;

    cargarOcupacion(tallerId, dia)
      .then((datos) => {
        if (vigente) setOcupacionCargada({ dia, datos });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (vigente) setOcupacionCargada({ dia, datos: OCUPACION_VACIA });
      });

    return () => {
      vigente = false;
    };
  }, [tallerId, dia]);

  const ocupacionEsDelDia = dia !== "" && ocupacionCargada?.dia === dia;

  return {
    horarios,
    festivos,
    ocupacion: ocupacionEsDelDia ? ocupacionCargada.datos : OCUPACION_VACIA,
    cargandoHorarios,
    cargandoOcupacion: dia !== "" && !ocupacionEsDelDia,
  };
}
