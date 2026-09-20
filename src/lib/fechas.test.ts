import { describe, expect, it } from "vitest";
import {
  diaSemana,
  esDiaPasado,
  esDiaValido,
  esFinDeSemana,
  esHoraPasada,
  etiquetaDia,
  formatearDia,
  formatearDiaCorto,
  formatearDiaLargo,
  horaCorta,
  hoy,
  minutosDelDia,
  parsearDia,
  sumarDias,
} from "./fechas";

// Lunes 21 de septiembre de 2026 a las 10:30, hora local de la máquina de pruebas.
const ahora = new Date(2026, 8, 21, 10, 30);

describe("formatearDia y parsearDia", () => {
  it("van y vuelven sin cambiar de día, sea cual sea la zona horaria", () => {
    expect(formatearDia(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(formatearDia(parsearDia("2026-09-21"))).toBe("2026-09-21");
    expect(parsearDia("2026-09-21").getHours()).toBe(0);
  });

  it("rechazan formatos y días inexistentes", () => {
    expect(() => parsearDia("21/09/2026")).toThrow();
    expect(() => parsearDia("2026-02-30")).toThrow();
    expect(esDiaValido("2026-02-28")).toBe(true);
    expect(esDiaValido("2026-2-8")).toBe(false);
  });
});

describe("hoy, sumarDias y días de la semana", () => {
  it("calcula hoy y suma días cruzando el mes", () => {
    expect(hoy(ahora)).toBe("2026-09-21");
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("usa la convención de Date.getDay: 0 domingo, 1 lunes", () => {
    expect(diaSemana("2026-09-21")).toBe(1);
    expect(diaSemana("2026-09-20")).toBe(0);
    expect(esFinDeSemana("2026-09-19")).toBe(true);
    expect(esFinDeSemana("2026-09-21")).toBe(false);
  });
});

describe("horas", () => {
  it("acorta y convierte a minutos", () => {
    expect(horaCorta("09:30:00")).toBe("09:30");
    expect(horaCorta("09:30")).toBe("09:30");
    expect(minutosDelDia("09:30:00")).toBe(570);
    expect(() => horaCorta("9:30")).toThrow();
  });

  it("decide si una hora ya ha pasado según el día", () => {
    expect(esHoraPasada("2026-09-21", "10:00", ahora)).toBe(true);
    expect(esHoraPasada("2026-09-21", "10:30", ahora)).toBe(true);
    expect(esHoraPasada("2026-09-21", "10:31", ahora)).toBe(false);
    expect(esHoraPasada("2026-09-22", "08:00", ahora)).toBe(false);
    expect(esHoraPasada("2026-09-20", "23:59", ahora)).toBe(true);
    expect(esDiaPasado("2026-09-20", ahora)).toBe(true);
    expect(esDiaPasado("2026-09-21", ahora)).toBe(false);
  });
});

describe("formato para personas", () => {
  it("día corto y largo en español", () => {
    expect(formatearDiaCorto("2026-09-21")).toBe("21/09/2026");
    expect(formatearDiaLargo("2026-09-21")).toMatch(/lunes, 21 de septiembre/);
    expect(formatearDiaLargo("2026-09-21", { conAnio: true })).toMatch(/2026/);
  });

  it("etiqueta hoy, mañana y el resto", () => {
    expect(etiquetaDia("2026-09-21", ahora)).toBe("Hoy");
    expect(etiquetaDia("2026-09-22", ahora)).toBe("Mañana");
    expect(etiquetaDia("2026-09-23", ahora)).toMatch(/miércoles, 23 de septiembre de 2026/);
  });
});
