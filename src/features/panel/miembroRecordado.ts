// Quién apuntó la última cita desde este dispositivo, para preseleccionarlo en "¿Quién la apunta?".
// Es solo una comodidad: si el navegador no deja guardar (modo privado, datos borrados), se elige a
// mano. Una clave por taller, como la sesión (`citaller-auth-<tallerId>`).
import type { MiembroTaller } from "./tipos";

function clave(tallerId: number): string {
  return `citaller-miembro-${tallerId}`;
}

/** El miembro recordado, si sigue en la lista de activos del taller. */
export function leerMiembroRecordado(tallerId: number, miembros: MiembroTaller[]): number | null {
  try {
    const id = Number(localStorage.getItem(clave(tallerId)));
    return miembros.some((miembro) => miembro.id === id) ? id : null;
  } catch {
    return null;
  }
}

export function recordarMiembro(tallerId: number, miembroId: number): void {
  try {
    localStorage.setItem(clave(tallerId), String(miembroId));
  } catch {
    // Sin almacenamiento: la próxima vez se elige a mano.
  }
}
