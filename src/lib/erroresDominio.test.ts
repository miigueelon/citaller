import { describe, expect, it } from "vitest";
import { ERROR_GENERICO, mensajeDeError } from "./erroresDominio";

describe("mensajeDeError", () => {
  it("traduce los códigos de dominio", () => {
    expect(mensajeDeError({ code: "CT001", message: "Sin hueco" })).toMatch(/acaba de llenarse/);
    expect(mensajeDeError({ code: "CT011" })).toMatch(/24 horas/);
  });

  it("reconoce el mensaje del trigger de aforo actual", () => {
    expect(mensajeDeError({ code: "P0001", message: "SpeedBikes ya tiene el máximo de 6 citas para este día" })).toMatch(/día completo/);
  });

  it("cae en un mensaje genérico para lo desconocido", () => {
    expect(mensajeDeError({ code: "42P01", message: "relation does not exist" })).toBe(ERROR_GENERICO);
    expect(mensajeDeError(null)).toBe(ERROR_GENERICO);
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toMatch(/conexión/);
  });
});
