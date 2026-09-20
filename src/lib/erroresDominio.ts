// Traduce los errores que devuelve la base de datos a mensajes para la persona que usa la app.
// Los códigos CTxxx los definirán las funciones SQL de la fase 3; mientras, se reconocen por texto.

interface ErrorSupabase {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const POR_CODIGO: Record<string, string> = {
  CT001: "Esa hora acaba de llenarse. Elige otra hora, por favor.",
  CT002: "El taller no atiende a esa hora. Elige una de las horas disponibles.",
  CT003: "Ese día es festivo para el taller. Elige otro día.",
  CT004: "Esa fecha ya ha pasado. Elige un día a partir de hoy.",
  CT005: "El teléfono no es válido. Escribe un número español de 9 cifras.",
  CT006: "Ya tienes varias citas activas con este taller. Llama al taller si necesitas otra.",
  CT007: "Ese servicio no está disponible en este taller.",
  CT008: "Faltan datos del servicio elegido. Revisa el formulario.",
  CT009: "Este taller no admite reservas por internet ahora mismo.",
  CT010: "No encontramos esa cita. Comprueba el enlace.",
  CT011: "Ya no se puede cancelar por internet: faltan menos de 24 horas. Llama al taller.",
  CT012: "Esta cita ya estaba cancelada.",
};

const POR_TEXTO: Array<[RegExp, string]> = [
  [/máximo de \d+ citas/i, "El taller ya tiene el día completo. Elige otro día, por favor."],
  [/violates check constraint "reservas_estado_check"/i, "El estado de la cita no es válido."],
  [/violates foreign key constraint "reservas_taller_id_fkey"/i, "El taller ya no existe."],
  [/network|fetch|Failed to fetch/i, "No hay conexión con el servidor. Comprueba tu internet e inténtalo de nuevo."],
];

export const ERROR_GENERICO = "No se pudo guardar la solicitud. Inténtalo de nuevo en un momento o llama al taller.";

export function mensajeDeError(error: ErrorSupabase | Error | unknown): string {
  const e = (error ?? {}) as ErrorSupabase;
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code];
  const texto = `${e.message ?? ""} ${e.details ?? ""}`;
  for (const [patron, mensaje] of POR_TEXTO) if (patron.test(texto)) return mensaje;
  return ERROR_GENERICO;
}
