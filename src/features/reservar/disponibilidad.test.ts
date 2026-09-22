import { describe, expect, it } from "vitest";
import {
  agruparOcupacion,
  diaSeleccionable,
  esAntesDelMinimo,
  estaCompleta,
  festivoDelDia,
  horaSigueDisponible,
  horasDisponibles,
  motivoCompleta,
  parsearMinimo,
  tallerAbre,
  type Horario,
} from "./disponibilidad";

// Lunes a viernes a las 9 y a las 10; los viernes también a las 12 con aviso de tarde.
const horarios: Horario[] = [
  ...[1, 2, 3, 4, 5].flatMap((dia_semana) => [
    { dia_semana, hora: "09:00:00", aviso_tarde: false },
    { dia_semana, hora: "10:00:00", aviso_tarde: false },
  ]),
  { dia_semana: 5, hora: "12:00:00", aviso_tarde: true },
];
const festivos = [{ fecha: "2026-09-24", nombre: "Fiesta local" }];

// Lunes 21 de septiembre de 2026 a las 09:30.
const ahora = new Date(2026, 8, 21, 9, 30);

describe("días", () => {
  it("abre de lunes a viernes y no en fin de semana ni festivos", () => {
    expect(tallerAbre(horarios, "2026-09-21")).toBe(true);
    expect(tallerAbre(horarios, "2026-09-20")).toBe(false);
    expect(diaSeleccionable(horarios, festivos, "2026-09-22")).toBe(true);
    expect(diaSeleccionable(horarios, festivos, "2026-09-24")).toBe(false);
    expect(diaSeleccionable(horarios, festivos, "2026-09-26")).toBe(false);
    expect(festivoDelDia(festivos, "2026-09-24")?.nombre).toBe("Fiesta local");
  });

  it("un sábado se puede elegir si el taller tiene horas del sábado (manda horarios_taller)", () => {
    const conSabado = [...horarios, { dia_semana: 6, hora: "10:00:00", aviso_tarde: false }];
    expect(diaSeleccionable(conSabado, festivos, "2026-09-26")).toBe(true);
    expect(diaSeleccionable(conSabado, festivos, "2026-09-27")).toBe(false); // domingo sin horas
  });
});

describe("ocupación", () => {
  it("agrupa las filas de la RPC por hora corta", () => {
    const ocupacion = agruparOcupacion([
      { hora: "09:00:00", total: 1 },
      { hora: "10:00:00", total: 2 },
      { hora: null, total: 5 },
    ]);
    expect(ocupacion).toEqual({ porHora: { "09:00": 1, "10:00": 2 }, total: 3 });
  });

  it("por hora: cada franja se llena por separado", () => {
    const ocupacion = agruparOcupacion([{ hora: "09:00:00", total: 2 }]);
    expect(estaCompleta(ocupacion, "09:00", 2, "por_hora")).toBe(true);
    expect(estaCompleta(ocupacion, "10:00", 2, "por_hora")).toBe(false);
  });

  it("por día: el total del día llena todas las franjas", () => {
    const ocupacion = agruparOcupacion([{ hora: "09:00:00", total: 6 }]);
    expect(estaCompleta(ocupacion, "10:00", 6, "por_dia")).toBe(true);
    expect(estaCompleta(ocupacion, "10:00", 7, "por_dia")).toBe(false);
  });

  it("por hora con tope diario: al llegar al tope se llena el día aunque la hora tenga sitio", () => {
    // Rik and Roll: 2 por hora y 5 al día.
    const cuatro = agruparOcupacion([
      { hora: "09:00:00", total: 2 },
      { hora: "10:00:00", total: 2 },
    ]);
    expect(motivoCompleta(cuatro, "11:00", 2, "por_hora", 5)).toBeNull();
    expect(motivoCompleta(cuatro, "09:00", 2, "por_hora", 5)).toBe("hora");

    const cinco = agruparOcupacion([
      { hora: "09:00:00", total: 2 },
      { hora: "10:00:00", total: 2 },
      { hora: "11:00:00", total: 1 },
    ]);
    expect(motivoCompleta(cinco, "11:00", 2, "por_hora", 5)).toBe("dia");
    expect(estaCompleta(cinco, "12:00", 2, "por_hora", 5)).toBe(true);
    // Sin tope, la misma ocupación deja libres las 11 y las 12.
    expect(estaCompleta(cinco, "11:00", 2, "por_hora")).toBe(false);
  });
});

describe("horas disponibles", () => {
  it("quita las pasadas de hoy y las llenas", () => {
    const ocupacion = agruparOcupacion([{ hora: "10:00:00", total: 2 }]);
    const horas = horasDisponibles({ horarios, dia: "2026-09-21", ocupacion, capacidad: 2, modo: "por_hora", ahora });
    // Las 9 ya han pasado (son las 9:30) y las 10 están llenas.
    expect(horas).toEqual([]);
  });

  it("mañana ofrece todas las horas del día de la semana, con su aviso", () => {
    const horas = horasDisponibles({ horarios, dia: "2026-09-25", ocupacion: { porHora: {}, total: 0 }, capacidad: 2, modo: "por_hora", ahora });
    expect(horas.map((h) => h.hora)).toEqual(["09:00", "10:00", "12:00"]);
    expect(horas.find((h) => h.hora === "12:00")?.aviso_tarde).toBe(true);
  });

  it("con el tope diario alcanzado no queda ninguna hora", () => {
    const ocupacion = agruparOcupacion([{ hora: "09:00:00", total: 2 }, { hora: "10:00:00", total: 1 }]);
    const parametros = { horarios, dia: "2026-09-25", ocupacion, capacidad: 2, modo: "por_hora" as const, ahora };
    expect(horasDisponibles(parametros).map((h) => h.hora)).toEqual(["10:00", "12:00"]);
    expect(horasDisponibles({ ...parametros, maxDia: 3 })).toEqual([]);
  });

  it("al cambiar de día (medianoche) las horas de mañana dejan de estar pasadas", () => {
    const parametros = { horarios, dia: "2026-09-22", ocupacion: { porHora: {}, total: 0 }, capacidad: 2, modo: "por_hora" as const };
    expect(horaSigueDisponible("09:00", { ...parametros, ahora: new Date(2026, 8, 21, 23, 59) })).toBe(true);
    expect(horaSigueDisponible("09:00", { ...parametros, ahora: new Date(2026, 8, 22, 9, 0) })).toBe(false);
  });
});

describe("antelación por servicio (primera hora posible que dice la base de datos)", () => {
  // Neumáticos en Rik and Roll: solicitud el lunes por la noche → los recibe el martes por la mañana →
  // primera hora, el martes a las 15:30.
  const minimo = { dia: "2026-09-22", hora: "15:30" };

  it("lee el timestamp de la RPC sin pasar por Date", () => {
    expect(parsearMinimo("2026-09-22T15:30:00")).toEqual(minimo);
    expect(parsearMinimo("2026-09-22 15:30:00")).toEqual(minimo);
    expect(parsearMinimo(null)).toBeNull();
    expect(parsearMinimo("")).toBeNull();
    expect(parsearMinimo("mañana")).toBeNull();
  });

  it("una hora es anterior al mínimo si es de un día anterior o del mismo día y más temprana", () => {
    expect(esAntesDelMinimo("2026-09-21", "18:00", minimo)).toBe(true);
    expect(esAntesDelMinimo("2026-09-22", "12:30", minimo)).toBe(true);
    expect(esAntesDelMinimo("2026-09-22", "15:30", minimo)).toBe(false);
    expect(esAntesDelMinimo("2026-09-22", "16:30:00", minimo)).toBe(false);
    expect(esAntesDelMinimo("2026-09-23", "08:30", minimo)).toBe(false);
    expect(esAntesDelMinimo("2026-09-21", "09:00", null)).toBe(false);
  });

  it("el calendario no deja elegir días anteriores al del mínimo (y el resto sigue igual)", () => {
    expect(diaSeleccionable(horarios, festivos, "2026-09-21", minimo)).toBe(false);
    expect(diaSeleccionable(horarios, festivos, "2026-09-22", minimo)).toBe(true);
    expect(diaSeleccionable(horarios, festivos, "2026-09-23", minimo)).toBe(true);
    expect(diaSeleccionable(horarios, festivos, "2026-09-24", minimo)).toBe(false); // festivo
    expect(diaSeleccionable(horarios, festivos, "2026-09-26", minimo)).toBe(false); // sábado
  });

  it("el día del mínimo solo ofrece las horas desde esa hora; los días siguientes, todas", () => {
    const conTarde: Horario[] = [...horarios, { dia_semana: 2, hora: "15:30:00", aviso_tarde: false }, { dia_semana: 2, hora: "16:30:00", aviso_tarde: true }];
    const base = { horarios: conTarde, ocupacion: { porHora: {}, total: 0 }, capacidad: 2, modo: "por_hora" as const, ahora };
    expect(horasDisponibles({ ...base, dia: "2026-09-22", minimo }).map((h) => h.hora)).toEqual(["15:30", "16:30"]);
    expect(horasDisponibles({ ...base, dia: "2026-09-23", minimo }).map((h) => h.hora)).toEqual(["09:00", "10:00"]);
    // Sin antelación (servicio normal) el martes ofrece también la mañana.
    expect(horasDisponibles({ ...base, dia: "2026-09-22" }).map((h) => h.hora)).toEqual(["09:00", "10:00", "15:30", "16:30"]);
    expect(horaSigueDisponible("10:00", { ...base, dia: "2026-09-22", minimo })).toBe(false);
  });
});
