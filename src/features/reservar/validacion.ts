// Validación del formulario de reserva. Lógica pura, probada en validacion.test.ts.
// La base de datos aplica las mismas reglas en `validar_datos_reserva` (fase 3.1).

import type { CampoFormulario, ServicioTaller } from "@/features/taller/api";
import type { ReservaEnCurso } from "./tipos";

/** Solo dígitos; a un móvil español de 9 cifras se le antepone el 34. */
export function normalizarTelefono(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 9 ? `34${digitos}` : digitos;
}

/** Para enseñar un teléfono guardado (34600111222) como se lee en España: "600 111 222". */
export function formatearTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  const nacional = digitos.length === 11 && digitos.startsWith("34") ? digitos.slice(2) : digitos;
  return nacional.length === 9 ? `${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}` : telefono;
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

/**
 * Nombre y, al menos, primer apellido: dos palabras (pedido de Miguel, 24-sep-2026, para la web y
 * el mostrador). La base de datos aplica la misma regla (CT023) en `crear_reserva_publica` y, si el
 * taller exige todos los datos, en `insertar_reserva_taller`.
 */
export function nombreConApellido(nombre: string): boolean {
  return /\S\s+\S/.test(nombre.trim());
}

export interface ErroresReserva {
  nombre?: string;
  matricula?: string;
  telefono?: string;
}

/** Mensajes de error de los campos con formato; vacío si todo está bien o aún no se ha escrito. */
export function erroresDeFormato(reserva: Pick<ReservaEnCurso, "nombre" | "matricula" | "telefono">): ErroresReserva {
  const errores: ErroresReserva = {};
  if (reserva.nombre.trim() !== "" && !nombreConApellido(reserva.nombre)) {
    errores.nombre = "Escribe tu nombre y primer apellido.";
  }
  if (reserva.matricula.trim() !== "" && !esMatriculaValida(reserva.matricula)) {
    errores.matricula = "Escribe la matrícula sin símbolos, por ejemplo 1234ABC.";
  }
  if (reserva.telefono.trim() !== "" && !esTelefonoValido(reserva.telefono)) {
    errores.telefono = "Escribe un teléfono español de 9 cifras, por ejemplo 600123123.";
  }
  return errores;
}

export interface ContextoValidacion {
  /** Servicio elegido (undefined si aún no se ha elegido). */
  servicio: ServicioTaller | undefined;
  /** Campos extra que aplican al servicio elegido. */
  campos: CampoFormulario[];
}

/** ¿Un valor de campo extra es válido para su tipo? (vacío cuenta como válido si no es obligatorio) */
export function campoValido(campo: CampoFormulario, valor: string | undefined): boolean {
  const texto = (valor ?? "").trim();
  if (texto === "") return !campo.obligatorio;
  if (campo.tipo === "numero") return /^\d{1,9}$/.test(texto);
  if (campo.tipo === "select") return (campo.opciones ?? []).includes(texto);
  return texto.length <= 250;
}

/** ¿Se puede pasar al siguiente paso? Obligatorios rellenos (nombre con apellido), sin errores de formato y campos extra válidos. */
export function formularioCompleto(reserva: ReservaEnCurso, { servicio, campos }: ContextoValidacion): boolean {
  const obligatorios =
    reserva.matricula.trim() !== "" &&
    nombreConApellido(reserva.nombre) &&
    reserva.telefono.trim() !== "" &&
    reserva.vehiculo.trim() !== "" &&
    servicio !== undefined;
  const descripcionOk = servicio?.descripcion_modo !== "obligatoria" || reserva.descripcion.trim() !== "";
  const camposOk = campos.every((campo) => campoValido(campo, reserva.datos_extra[campo.clave]));
  const sinErrores = Object.keys(erroresDeFormato(reserva)).length === 0;
  return obligatorios && descripcionOk && camposOk && sinErrores;
}
