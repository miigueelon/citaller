import { describe, expect, it } from "vitest";
import type { CampoFormulario, ServicioTaller } from "@/features/taller/api";
import { camposParaMostrador, datosQueFaltan, horasSugeridas } from "./citaManual";
import type { DatosCitaManual } from "./useReservasTaller";

const frenos: ServicioTaller = { id: 1, nombre: "Frenos", orden: 1, descripcion_modo: "oculta", descripcion_etiqueta: null, descripcion_placeholder: null, descripcion_ayuda: null, imagen_ayuda_url: null, bloques_antelacion: 0, antelacion_texto: null };
const averia: ServicioTaller = { ...frenos, id: 2, nombre: "Avería / luz de aviso", descripcion_modo: "opcional", descripcion_etiqueta: "Cuéntanos qué ocurre" };
const neumaticos: ServicioTaller = { ...frenos, id: 3, nombre: "Neumáticos", descripcion_modo: "obligatoria", descripcion_etiqueta: "Medidas / observaciones" };

const cantidad: CampoFormulario = { id: 10, servicio_id: 3, clave: "cantidad_neumaticos", etiqueta: "¿Cuántos neumáticos quieres cambiar?", tipo: "select", opciones: ["2", "4"], opciones_panel: ["1", "2", "3", "4"], obligatorio: true, orden: 1, unidad: null, ayuda: null };
const kilometros: CampoFormulario = { id: 11, servicio_id: null, clave: "kilometros", etiqueta: "Kilómetros (opcional)", tipo: "numero", opciones: null, opciones_panel: null, obligatorio: false, orden: 2, unidad: "km", ayuda: null };

const completa: DatosCitaManual = { nombre: "Marta Bernat", telefono: "600123123", matricula: "1234ABC", vehiculo: "Seat León", servicio: "Frenos", descripcion: "", dia: "2026-10-05", hora: "09:00", datos_extra: {}, miembro_id: 5 };
const contexto = { exigirTodo: true, preguntarMiembro: true, miembroId: 5, servicio: frenos, campos: [] as CampoFormulario[] };

// `nombreConApellido` se prueba en features/reservar/validacion.test.ts (misma regla para la web y el mostrador).
describe("datosQueFaltan", () => {
  it("no falta nada con la cita completa", () => {
    expect(datosQueFaltan(completa, contexto)).toEqual([]);
  });

  it("con datos obligatorios exige teléfono y primer apellido", () => {
    expect(datosQueFaltan({ ...completa, telefono: "" }, contexto)).toEqual(["el teléfono"]);
    expect(datosQueFaltan({ ...completa, nombre: "Marta" }, contexto)).toEqual(["el primer apellido"]);
  });

  it("sin datos obligatorios el teléfono y el apellido son opcionales", () => {
    const relajado = { ...contexto, exigirTodo: false };
    expect(datosQueFaltan({ ...completa, telefono: "", nombre: "Marta" }, relajado)).toEqual([]);
  });

  it("un teléfono o una matrícula mal escritos cuentan como que faltan, en cualquier modo", () => {
    expect(datosQueFaltan({ ...completa, telefono: "12345" }, { ...contexto, exigirTodo: false })).toEqual(["un teléfono válido"]);
    expect(datosQueFaltan({ ...completa, matricula: "12*" }, contexto)).toEqual(["una matrícula válida"]);
  });

  it("pide quién la apunta solo si el taller tiene mecánicos", () => {
    expect(datosQueFaltan(completa, { ...contexto, miembroId: null })).toEqual(["quién la apunta"]);
    expect(datosQueFaltan({ ...completa, miembro_id: null }, { ...contexto, preguntarMiembro: false, miembroId: null })).toEqual([]);
  });

  it("con datos obligatorios la descripción opcional del servicio pasa a ser obligatoria; la oculta no", () => {
    expect(datosQueFaltan({ ...completa, servicio: averia.nombre }, { ...contexto, servicio: averia })).toEqual(["Cuéntanos qué ocurre"]);
    expect(datosQueFaltan({ ...completa, servicio: averia.nombre }, { ...contexto, servicio: averia, exigirTodo: false })).toEqual([]);
    expect(datosQueFaltan({ ...completa, servicio: neumaticos.nombre, datos_extra: { cantidad_neumaticos: "1" } }, { ...contexto, servicio: neumaticos, campos: [cantidad] })).toEqual(["Medidas / observaciones"]);
    expect(datosQueFaltan(completa, contexto)).toEqual([]);
  });

  it("los campos extra siguen su propia configuración (obligatorio u opcional) y se nombran por su etiqueta", () => {
    const ctx = { ...contexto, servicio: neumaticos, campos: camposParaMostrador([cantidad, kilometros]) };
    const cita = { ...completa, servicio: neumaticos.nombre, descripcion: "205/55 R16" };
    expect(datosQueFaltan(cita, ctx)).toEqual(["¿Cuántos neumáticos quieres cambiar?"]);
    // En el mostrador vale "1" (opciones del panel), aunque el público solo vea 2 y 4.
    expect(datosQueFaltan({ ...cita, datos_extra: { cantidad_neumaticos: "1" } }, ctx)).toEqual([]);
    expect(datosQueFaltan({ ...cita, datos_extra: { cantidad_neumaticos: "1", kilometros: "12a" } }, ctx)).toEqual(["Kilómetros"]);
  });

  it("una hora de hoy que ya ha pasado no vale; una posterior sí; un día anterior a hoy tampoco", () => {
    // Lunes 5-oct-2026 a las 10:30 (hora local del dispositivo).
    const ahora = new Date(2026, 9, 5, 10, 30);
    expect(datosQueFaltan({ ...completa, dia: "2026-10-05", hora: "09:00" }, contexto, ahora)).toEqual(["una hora posterior a la actual"]);
    expect(datosQueFaltan({ ...completa, dia: "2026-10-05", hora: "10:30" }, contexto, ahora)).toEqual(["una hora posterior a la actual"]);
    expect(datosQueFaltan({ ...completa, dia: "2026-10-05", hora: "10:31" }, contexto, ahora)).toEqual([]);
    expect(datosQueFaltan({ ...completa, dia: "2026-10-06", hora: "09:00" }, contexto, ahora)).toEqual([]);
    expect(datosQueFaltan({ ...completa, dia: "2026-10-04", hora: "23:00" }, contexto, ahora)).toEqual(["un día a partir de hoy"]);
  });

  it("enumera todo lo que falta, en el orden del formulario", () => {
    const vacia: DatosCitaManual = { nombre: "", telefono: "", matricula: "", vehiculo: "", servicio: "", descripcion: "", dia: "", hora: "", datos_extra: {}, miembro_id: null };
    expect(datosQueFaltan(vacia, { ...contexto, miembroId: null, servicio: undefined })).toEqual(["quién la apunta", "el nombre", "el teléfono", "la matrícula", "el vehículo", "el servicio", "el día", "la hora"]);
  });
});

describe("camposParaMostrador", () => {
  it("usa las opciones del panel cuando el campo las tiene y las públicas si no", () => {
    const [c, k] = camposParaMostrador([cantidad, kilometros]);
    expect(c.opciones).toEqual(["1", "2", "3", "4"]);
    expect(k.opciones).toBeNull();
    // No toca el original.
    expect(cantidad.opciones).toEqual(["2", "4"]);
  });
});

describe("horasSugeridas", () => {
  const horarios = [
    { dia_semana: 1, hora: "09:00:00" },
    { dia_semana: 1, hora: "12:00:00" },
    { dia_semana: 1, hora: "10:00:00" },
    { dia_semana: 1, hora: "16:00:00" },
    { dia_semana: 2, hora: "09:00:00" },
  ];
  // El lunes 5-oct-2026 a las 10:30 en hora local.
  const lunes1030 = new Date(2026, 9, 5, 10, 30);

  it("para hoy quita las horas que ya han pasado (la actual incluida) y ordena", () => {
    expect(horasSugeridas(horarios, "2026-10-05", lunes1030)).toEqual(["12:00", "16:00"]);
  });

  it("para otro día ofrece todas las del horario de ese día de la semana", () => {
    expect(horasSugeridas(horarios, "2026-10-12", lunes1030)).toEqual(["09:00", "10:00", "12:00", "16:00"]);
    expect(horasSugeridas(horarios, "2026-10-06", lunes1030)).toEqual(["09:00"]);
  });

  it("sin día, o un día sin horario, no sugiere nada", () => {
    expect(horasSugeridas(horarios, "", lunes1030)).toEqual([]);
    expect(horasSugeridas(horarios, "2026-10-10", lunes1030)).toEqual([]);
  });
});
