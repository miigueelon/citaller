import { useCallback, useState } from "react";
import { reservaVacia, type ReservaEnCurso } from "./tipos";

export type Paso = 1 | 2 | 3 | 4;

/** Estado del asistente de reserva: los datos que va rellenando el cliente y el paso actual. */
export function useReservaWizard(tallerId: number) {
  const [paso, setPaso] = useState<Paso>(1);
  const [reserva, setReserva] = useState<ReservaEnCurso>(() => reservaVacia(tallerId));

  /** Cambia uno o varios campos. Usa actualizaciones funcionales: nunca pisa un cambio anterior. */
  const actualizar = useCallback((cambios: Partial<ReservaEnCurso>) => {
    setReserva((anterior) => ({ ...anterior, ...cambios }));
  }, []);

  const reiniciar = useCallback(() => {
    setReserva(reservaVacia(tallerId));
    setPaso(1);
  }, [tallerId]);

  return { paso, setPaso, reserva, actualizar, reiniciar };
}
