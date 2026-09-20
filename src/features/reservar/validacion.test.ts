import { describe, expect, it } from "vitest";
import { reservaVacia } from "./tipos";
import { erroresDeFormato, esMatriculaValida, esTelefonoValido, formularioCompleto, normalizarMatricula, normalizarTelefono } from "./validacion";

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

describe("formulario", () => {
  const base = { ...reservaVacia(3), matricula: "1234ABC", nombre: "Ana", telefono: "600123123", vehiculo: "Seat León", servicio: "Frenos" };

  it("solo avisa de formato cuando el campo tiene algo escrito", () => {
    expect(erroresDeFormato({ matricula: "", telefono: "" })).toEqual({});
    expect(erroresDeFormato({ matricula: "12*34", telefono: "600123123" }).matricula).toMatch(/matrícula/);
    expect(erroresDeFormato({ matricula: "1234ABC", telefono: "12" }).telefono).toMatch(/9 cifras/);
  });

  it("está completo con los obligatorios y formatos correctos", () => {
    expect(formularioCompleto(base, { neumaticosConMedidas: false })).toBe(true);
    expect(formularioCompleto({ ...base, telefono: "12" }, { neumaticosConMedidas: false })).toBe(false);
    expect(formularioCompleto({ ...base, nombre: " " }, { neumaticosConMedidas: false })).toBe(false);
  });

  it("con neumáticos exige cantidad y medidas", () => {
    const neumaticos = { ...base, servicio: "Neumáticos" };
    expect(formularioCompleto(neumaticos, { neumaticosConMedidas: true })).toBe(false);
    expect(formularioCompleto({ ...neumaticos, cantidad_neumaticos: "2", descripcion: "205/55 R16" }, { neumaticosConMedidas: true })).toBe(true);
  });
});
