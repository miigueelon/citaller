// ÚNICO sitio del frontend donde puede haber un identificador de taller escrito a mano.
// Todo esto desaparece en la fase 3, cuando la configuración por taller viva en la base de datos
// (`servicios_taller`, `campos_formulario_taller`, `talleres.modo_capacidad`).
// Regla (CLAUDE.md): fuera de este fichero, nunca `tallerId === N`.

/** `/` sin `?taller=` abre este taller, como hasta ahora. */
export const TALLER_POR_DEFECTO_ID = 1;

/** Speedbikes pide los kilómetros de la moto. */
export function tallerPideKilometros(tallerId: number): boolean {
  return tallerId === 1;
}

/** En Rik and Roll, el servicio de neumáticos pide cantidad y medidas (con imagen de ayuda). */
export function esNeumaticosConMedidas(tallerId: number, servicio: string): boolean {
  return tallerId === 2 && servicio === "Neumáticos";
}

/** Speedbikes limita las citas por día; el resto, por hora. */
export function capacidadEsPorDia(tallerId: number): boolean {
  return tallerId === 1;
}
