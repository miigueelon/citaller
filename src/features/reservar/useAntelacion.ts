import { useEffect, useState } from "react";
import { cargarAntelacionMinima } from "./api";
import type { MinimoReserva } from "./disponibilidad";

interface MinimoDeUnServicio {
  servicioId: number;
  minimo: MinimoReserva | null;
}

/**
 * Primera hora posible del servicio elegido cuando tiene antelación (`bloques_antelacion > 0`).
 * Se pide a la base de datos al entrar en la pantalla y se vuelve a pedir con cada tic de `ahora`
 * (cada 30 s): al terminar un bloque de apertura la primera hora posible cambia, y así las horas
 * que dejan de valer desaparecen solas, como las que van pasando.
 * Si la llamada falla, no se filtra nada: la base de datos rechaza igualmente la hora (CT021).
 */
export function useAntelacion(tallerId: number, servicioId: number | null, tieneAntelacion: boolean, ahora: Date) {
  const [cargado, setCargado] = useState<MinimoDeUnServicio | null>(null);

  useEffect(() => {
    if (!tieneAntelacion || servicioId === null) return;
    let vigente = true;

    cargarAntelacionMinima(tallerId, servicioId)
      .then((minimo) => {
        if (vigente) setCargado({ servicioId, minimo });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (vigente) setCargado({ servicioId, minimo: null });
      });

    return () => {
      vigente = false;
    };
  }, [tallerId, servicioId, tieneAntelacion, ahora]);

  if (!tieneAntelacion || servicioId === null) return { minimo: null, cargandoMinimo: false };
  const esDelServicio = cargado !== null && cargado.servicioId === servicioId;
  return { minimo: esDelServicio ? cargado.minimo : null, cargandoMinimo: !esDelServicio };
}
