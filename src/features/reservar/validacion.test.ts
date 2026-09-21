import { describe, expect, it } from "vitest";
import type { CampoFormulario, ServicioTaller } from "@/features/taller/api";
import { reservaVacia } from "./tipos";
import { campoValido, erroresDeFormato, esMatriculaValida, esTelefonoValido, formularioCompleto, normalizarMatricula, normalizarTelefono, formatearTelefono } from "./validacion";

describe("teléfono", () => {
  it("normaliza quitando espacios y guiones y anteponiendo el 34 a 9 cifras", () => {
    expect(normalizarTelefono("600 12 31 23")).toBe("34600123123");
    expect(normalizarTelefono("+34 600-123-123")).toBe("34600123123");
    expect(normalizarTelefono("34600123123")).toBe("34600123123");
  });

  it("acepta móviles y fijos españoles y rechaza el resto", () => {
    expect(esTelefonoValido("600123123")).toBe(true);
    expect(esTelefonoValido("+34 712 345 678")).toBe(true);
    expect(esTelefonoValido("936342040")).toBe(true);
    expect(esTelefonoValido("12345")).toBe(false);
    expect(esTelefonoValido("500123123")).toBe(false);
    expect(esTelefonoValido("+44 7911 123456")).toBe(false);
    expect(esTelefonoValido("")).toBe(false);
  });
});

describe("matrícula", () => {
  it("normaliza a mayúsculas sin espacios ni guiones", () => {
    expect(normalizarMatricula("1234 abc")).toBe("1234ABC");
    expect(normalizarMatricula("m-1234-ab")).toBe("M1234AB");
  });

  it("acepta formatos españoles habituales y rechaza símbolos", () => {
    expect(esMatriculaValida("1234ABC")).toBe(true);
    expect(esMatriculaValida("M 1234 AB")).toBe(true);
    expect(esMatriculaValida("C1234BBB")).toBe(true);
    expect(esMatriculaValida("12*34")).toBe(false);
    expect(esMatriculaValida("123")).toBe(false);
  });
});

const frenos: ServicioTaller = {
  id: 1,
  nombre: "Frenos",
  orden: 3,
  descripcion_modo: "oculta",
  descripcion_etiqueta: null,
  descripcion_placeholder: null,
  descripcion_ayuda: null,
  imagen_ayuda_url: null,
};
const neumaticos: ServicioTaller = { ...frenos, id: 2, nombre: "Neumáticos", descripcion_modo: "obligatoria" };
const kilometros: CampoFormulario = { id: 1, servicio_id: null, clave: "kilometros", etiqueta: "Kilómetros", tipo: "numero", opciones: null, obligatorio: false, orden: 1, unidad: "km", ayuda: null };
const cantidad: CampoFormulario = { id: 2, servicio_id: 2, clave: "cantidad_neumaticos", etiqueta: "¿Cuántos?", tipo: "select", opciones: ["1", "2", "3", "4"], obligatorio: true, orden: 1, unidad: null, ayuda: null };

describe("campos extra", () => {
  it("valida por tipo y obligatoriedad", () => {
    expect(campoValido(kilometros, "")).toBe(true);
    expect(campoValido(kilometros, "45000")).toBe(true);
    expect(campoValido(kilometros, "45.000")).toBe(false);
    expect(campoValido(cantidad, "")).toBe(false);
    expect(campoValido(cantidad, "2")).toBe(true);
    expect(campoValido(cantidad, "9")).toBe(false);
  });
});

describe("formulario", () => {
  const base = { ...reservaVacia(3), matricula: "1234ABC", nombre: "Ana", telefono: "600123123", vehiculo: "Seat León", servicio: "Frenos" };

  it("solo avisa de formato cuando el campo tiene algo escrito", () => {
    expect(erroresDeFormato({ matricula: "", telefono: "" })).toEqual({});
    expect(erroresDeFormato({ matricula: "12*34", telefono: "600123123" }).matricula).toMatch(/matrícula/);
    expect(erroresDeFormato({ matricula: "1234ABC", telefono: "12" }).telefono).toMatch(/9 cifras/);
  });

  it("está completo con los obligatorios y formatos correctos", () => {
    expect(formularioCompleto(base, { servicio: frenos, campos: [kilometros] })).toBe(true);
    expect(formularioCompleto({ ...base, telefono: "12" }, { servicio: frenos, campos: [] })).toBe(false);
    expect(formularioCompleto({ ...base, nombre: " " }, { servicio: frenos, campos: [] })).toBe(false);
    expect(formularioCompleto(base, { servicio: undefined, campos: [] })).toBe(false);
  });

  it("con neumáticos exige la descripción obligatoria y el campo obligatorio", () => {
    const conNeumaticos = { ...base, servicio: "Neumáticos" };
    expect(formularioCompleto(conNeumaticos, { servicio: neumaticos, campos: [kilometros, cantidad] })).toBe(false);
    expect(
      formularioCompleto({ ...conNeumaticos, descripcion: "205/55 R16", datos_extra: { cantidad_neumaticos: "2" } }, { servicio: neumaticos, campos: [kilometros, cantidad] }),
    ).toBe(true);
  });
});

describe("formatearTelefono", () => {
  it("quita el 34 y separa en grupos de tres", () => {
    expect(formatearTelefono("34600111222")).toBe("600 111 222");
    expect(formatearTelefono("600111222")).toBe("600 111 222");
  });

  it("deja tal cual lo que no es un número español de 9 cifras", () => {
    expect(formatearTelefono("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});
