// Validación del formulario de reserva. Lógica pura, probada en validacion.test.ts.
// La misma normalización de teléfono la aplicará la base de datos en la fase 3 (`normalizar_telefono`).

import type { ReservaEnCurso } from "./tipos";

/** Solo dígitos; a un móvil español de 9 cifras se le antepone el 34. */
export function normalizarTelefono(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 9 ? `34${digitos}` : digitos;
}

/** Teléfono español (fijo o móvil) con o sin prefijo 34, admitiendo espacios y guiones. */
export function esTelefonoValido(texto: string): boolean {
  return /^34[6-9]\d{8}$/.test(normalizarTelefono(texto));
}

/** Matrícula: letras y números, entre 4 y 10 caracteres, sin contar espacios ni guiones. */
export function normalizarMatricula(texto: string): string {
  return texto.replace(/[\s-]/g, "").toUpperCase();
}

export function esMatriculaValida(texto: string): boolean {
  return /^[A-Z0-9]{4,10}$/.test(normalizarMatricula(texto));
}

export interface ErroresReserva {
  matricula?: string;
  telefono?: string;
}

/** Mensajes de error de los campos con formato; vacío si todo está bien o aún no se ha escrito. */
export function erroresDeFormato(reserva: Pick<ReservaEnCurso, "matricula" | "telefono">): ErroresReserva {
  const errores: ErroresReserva = {};
  if (reserva.matricula.trim() !== "" && !esMatriculaValida(reserva.matricula)) {
    errores.matricula = "Escribe la matrícula sin símbolos, por ejemplo 1234ABC.";
  }
  if (reserva.telefono.trim() !== "" && !esTelefonoValido(reserva.telefono)) {
    errores.telefono = "Escribe un teléfono español de 9 cifras, por ejemplo 600123123.";
  }
  return errores;
}

export interface OpcionesValidacion {
  /** El servicio elegido exige cantidad de neumáticos y medidas (Rik and Roll). */
  neumaticosConMedidas: boolean;
}

/** ¿Se puede pasar al siguiente paso? Obligatorios rellenos y sin errores de formato. */
export function formularioCompleto(reserva: ReservaEnCurso, { neumaticosConMedidas }: OpcionesValidacion): boolean {
  const obligatorios =
    reserva.matricula.trim() !== "" &&
    reserva.nombre.trim() !== "" &&
    reserva.telefono.trim() !== "" &&
    reserva.vehiculo.trim() !== "" &&
    reserva.servicio !== "";
  const extras = !neumaticosConMedidas || (reserva.cantidad_neumaticos !== "" && reserva.descripcion.trim() !== "");
  const sinErrores = Object.keys(erroresDeFormato(reserva)).length === 0;
  return obligatorios && extras && sinErrores;
}
