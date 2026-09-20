import { describe, expect, it } from "vitest";
import { agruparPorDia, filtrarReservas, historial, porEstado, reservasFuturas, tituloGrupo, totalValidas } from "./filtros";
import type { ReservaPanel } from "./tipos";

// Lunes 21 de septiembre de 2026, 10:00.
const ahora = new Date(2026, 8, 21, 10, 0);

function reserva(parcial: Partial<ReservaPanel> & { id: number; dia: string }): ReservaPanel {
  return {
    taller_id: 3,
    nombre: "Cliente",
    telefono: "600111222",
    matricula: "1234ABC",
    vehiculo: "Coche",
    servicio: "Revisión",
    descripcion: null,
    kilometros: null,
    estado: "Pendiente",
    hora: "10:00:00",
    ...parcial,
  };
}

const lista: ReservaPanel[] = [
  reserva({ id: 1, dia: "2026-09-18", estado: "Confirmada", hora: "09:00:00" }), // viernes pasado
  reserva({ id: 2, dia: "2026-09-21", nombre: "Ana López", matricula: "9999ZZZ" }), // hoy
  reserva({ id: 3, dia: "2026-09-22", estado: "Confirmada", vehiculo: "Moto Yamaha" }), // mañana
  reserva({ id: 4, dia: "2026-09-26", estado: "Confirmada" }), // sábado futuro
  reserva({ id: 5, dia: "2026-09-29", estado: "Cancelada" }), // dentro de 8 días
  reserva({ id: 6, dia: "2026-09-19", estado: "Cancelada", hora: "12:00:00" }), // sábado pasado
];

describe("futuras, estados e historial", () => {
  it("las futuras excluyen las pasadas e incluyen los fines de semana", () => {
    expect(reservasFuturas(lista, ahora).map((r) => r.id)).toEqual([2, 3, 4, 5]);
  });

  it("separa por estado y cuenta las válidas sin las canceladas", () => {
    const futuras = reservasFuturas(lista, ahora);
    expect(porEstado(futuras, "Pendiente").map((r) => r.id)).toEqual([2]);
    expect(porEstado(futuras, "Confirmada").map((r) => r.id)).toEqual([3, 4]);
    expect(totalValidas(lista)).toBe(4);
  });

  it("el historial son las pasadas, de la más reciente a la más antigua", () => {
    expect(historial(lista, ahora).map((r) => r.id)).toEqual([6, 1]);
  });
});

describe("filtrar", () => {
  const futuras = reservasFuturas(lista, ahora);

  it("busca por nombre, matrícula o vehículo sin distinguir mayúsculas", () => {
    expect(filtrarReservas(futuras, { busqueda: "ana", filtroFecha: "todas" }, ahora).map((r) => r.id)).toEqual([2]);
    expect(filtrarReservas(futuras, { busqueda: "9999zzz", filtroFecha: "todas" }, ahora).map((r) => r.id)).toEqual([2]);
    expect(filtrarReservas(futuras, { busqueda: "yamaha", filtroFecha: "todas" }, ahora).map((r) => r.id)).toEqual([3]);
  });

  it("filtra por hoy, mañana y próximos 7 días", () => {
    expect(filtrarReservas(futuras, { busqueda: "", filtroFecha: "hoy" }, ahora).map((r) => r.id)).toEqual([2]);
    expect(filtrarReservas(futuras, { busqueda: "", filtroFecha: "manana" }, ahora).map((r) => r.id)).toEqual([3]);
    expect(filtrarReservas(futuras, { busqueda: "", filtroFecha: "7dias" }, ahora).map((r) => r.id)).toEqual([2, 3, 4]);
  });
});

describe("agrupar y titular", () => {
  it("agrupa por día conservando el orden", () => {
    const grupos = agruparPorDia([lista[1], lista[2], reserva({ id: 7, dia: "2026-09-22", hora: "11:00:00" })]);
    expect(grupos.map(([dia, items]) => [dia, items.length])).toEqual([
      ["2026-09-21", 1],
      ["2026-09-22", 2],
    ]);
  });

  it("titula hoy, mañana y el resto", () => {
    expect(tituloGrupo("2026-09-21", ahora)).toBe("HOY");
    expect(tituloGrupo("2026-09-22", ahora)).toBe("MAÑANA");
    expect(tituloGrupo("2026-09-23", ahora)).toMatch(/miércoles, 23 de septiembre/);
  });
});
