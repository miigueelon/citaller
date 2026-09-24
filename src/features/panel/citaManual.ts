// Lógica pura de "Nueva cita" (la cita que apunta el taller desde el mostrador). Probada en
// citaManual.test.ts. La base de datos aplica las mismas reglas en `insertar_reserva_taller`
// (CT017 quién la apunta, CT022 teléfono, CT023 apellido, CT008 descripción y campos extra).

import { campoValido, esMatriculaValida, esTelefonoValido, nombreConApellido } from "@/features/reservar/validacion";
import type { CampoFormulario, ServicioTaller } from "@/features/taller/api";
import { diaSemana, esDiaPasado, esDiaValido, esHoraPasada } from "@/lib/fechas";
import type { DatosCitaManual } from "./useReservasTaller";

/** En el mostrador un desplegable puede tener su propia lista (`opciones_panel`); si no, la del público. */
export function camposParaMostrador(campos: CampoFormulario[]): CampoFormulario[] {
  return campos.map((campo) => (campo.opciones_panel ? { ...campo, opciones: campo.opciones_panel } : campo));
}

export interface ContextoCitaManual {
  /** `talleres.mostrador_datos_obligatorios`: teléfono, apellido y descripción (si el servicio la tiene) obligatorios. */
  exigirTodo: boolean;
  /** El taller tiene mecánicos: hay que decir quién la apunta. */
  preguntarMiembro: boolean;
  /** Quién la apunta (elegido o recordado en el dispositivo). */
  miembroId: number | null;
  servicio: ServicioTaller | undefined;
  /** Campos extra que aplican al servicio. */
  campos: CampoFormulario[];
}

/** ¿La descripción del servicio es obligatoria en el mostrador? La "opcional" lo es si el taller exige todos los datos. */
export function descripcionObligatoriaEnMostrador(servicio: ServicioTaller | undefined, exigirTodo: boolean): boolean {
  if (!servicio) return false;
  return servicio.descripcion_modo === "obligatoria" || (exigirTodo && servicio.descripcion_modo === "opcional");
}

/** Etiqueta de un campo extra tal como se enseña (sin el "(opcional)" que algún seed escribió). */
function etiquetaCampo(campo: CampoFormulario): string {
  return campo.etiqueta.replace(/\s*\(opcional\)/i, "").trim();
}

/**
 * Qué falta (o está mal escrito) para poder guardar, en el orden del formulario. Vacío = se puede
 * guardar. `ahora` decide si la hora ya ha pasado (la base de datos lo vuelve a comprobar: CT024).
 */
export function datosQueFaltan(datos: DatosCitaManual, ctx: ContextoCitaManual, ahora: Date = new Date()): string[] {
  const faltan: string[] = [];
  if (ctx.preguntarMiembro && ctx.miembroId === null) faltan.push("quién la apunta");

  if (datos.nombre.trim() === "") faltan.push("el nombre");
  else if (ctx.exigirTodo && !nombreConApellido(datos.nombre)) faltan.push("el primer apellido");

  if (datos.telefono.trim() === "") {
    if (ctx.exigirTodo) faltan.push("el teléfono");
  } else if (!esTelefonoValido(datos.telefono)) faltan.push("un teléfono válido");

  if (datos.matricula.trim() === "") faltan.push("la matrícula");
  else if (!esMatriculaValida(datos.matricula)) faltan.push("una matrícula válida");

  if (datos.vehiculo.trim() === "") faltan.push("el vehículo");

  if (!ctx.servicio) faltan.push("el servicio");
  else {
    if (descripcionObligatoriaEnMostrador(ctx.servicio, ctx.exigirTodo) && datos.descripcion.trim() === "") {
      faltan.push(ctx.servicio.descripcion_etiqueta ?? "la descripción");
    }
    // Los campos extra siguen su propia configuración (obligatorio u opcional), con las opciones del mostrador.
    for (const campo of camposParaMostrador(ctx.campos)) {
      if (!campoValido(campo, datos.datos_extra[campo.clave])) faltan.push(etiquetaCampo(campo));
    }
  }

  if (datos.dia === "") faltan.push("el día");
  else if (esDiaValido(datos.dia) && esDiaPasado(datos.dia, ahora)) faltan.push("un día a partir de hoy");
  if (datos.hora === "") faltan.push("la hora");
  // Una hora de hoy que ya ha pasado no se puede escoger (pedido del 24-sep); un día futuro nunca lo está.
  else if (datos.dia !== "" && esDiaValido(datos.dia) && !esDiaPasado(datos.dia, ahora) && esHoraPasada(datos.dia, datos.hora, ahora)) {
    faltan.push("una hora posterior a la actual");
  }
  return faltan;
}

type HorarioDia = { dia_semana: number; hora: string };

/** Horas del horario del taller para ese día de la semana, "HH:MM", ordenadas. */
export function horasDelHorario(horarios: HorarioDia[], dia: string): string[] {
  if (!esDiaValido(dia)) return [];
  const dow = diaSemana(dia);
  return horarios
    .filter((h) => h.dia_semana === dow)
    .map((h) => h.hora.substring(0, 5))
    .sort();
}

/** Las horas que se sugieren al apuntar: las del horario, sin las que ya han pasado si el día es hoy. */
export function horasSugeridas(horarios: HorarioDia[], dia: string, ahora: Date = new Date()): string[] {
  return horasDelHorario(horarios, dia).filter((hora) => !esHoraPasada(dia, hora, ahora));
}
