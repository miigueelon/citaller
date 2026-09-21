import { describe, expect, it } from "vitest";
import { agruparPorDia, conAviso, filtrarReservas, historial, marcaAviso, porEstado, resumenCabecera, reservasFuturas, textoLista, textoResumen, tituloGrupo } from "./filtros";
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
    datos_extra: {},
    estado: "Pendiente",
    hora: "10:00:00",
    creada_por: "cliente",
    apuntada_por: null,
    cancelada_por: null,
    cancelada_en: null,
    confirmada_en: null,
    listo_en: null,
    token_publico: "00000000-0000-0000-0000-000000000000",
    whatsapp_confirmacion_enviada: false,
    whatsapp_confirmacion_fecha: null,
    whatsapp_cancelacion_enviada: false,
    whatsapp_cancelacion_fecha: null,
    whatsapp_recordatorio_enviado: false,
    whatsapp_recordatorio_fecha: null,
    whatsapp_error: null,
    google_event_id: null,
    google_error: null,
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

  it("separa por estado", () => {
    const futuras = reservasFuturas(lista, ahora);
    expect(porEstado(futuras, "Pendiente").map((r) => r.id)).toEqual([2]);
    expect(porEstado(futuras, "Confirmada").map((r) => r.id)).toEqual([3, 4]);
  });

  it("el historial son las confirmadas pasadas, de la más reciente a la más antigua", () => {
    const conMasPasadas = [
      ...lista,
      reserva({ id: 7, dia: "2026-09-17", estado: "Confirmada", creada_por: "taller" }), // a mano
      reserva({ id: 8, dia: "2026-09-17", estado: "Pendiente" }), // nadie la respondió
    ];
    // La 6 (cancelada) y la 8 (pendiente) no salen.
    expect(historial(conMasPasadas, ahora).map((r) => r.id)).toEqual([1, 7]);
  });
});

describe("cabecera", () => {
  it("cuenta las confirmadas de hoy y las pendientes de hoy en adelante", () => {
    const conHoy = [
      ...lista,
      reserva({ id: 7, dia: "2026-09-21", estado: "Confirmada", hora: "12:00:00" }),
      reserva({ id: 8, dia: "2026-09-21", estado: "Confirmada", creada_por: "taller" }),
      reserva({ id: 9, dia: "2026-09-21", estado: "Cancelada" }),
      reserva({ id: 10, dia: "2026-09-25", estado: "Pendiente" }),
      reserva({ id: 11, dia: "2026-09-15", estado: "Pendiente" }), // pasada: ya no se puede responder
    ];
    expect(resumenCabecera(conHoy, ahora)).toEqual({ porTerminar: 2, terminadas: 0, porResponder: 2 });
    expect(resumenCabecera([], ahora)).toEqual({ porTerminar: 0, terminadas: 0, porResponder: 0 });
  });

  it("una cita con el vehículo listo deja de contar como por terminar", () => {
    const hoyTres = [
      reserva({ id: 7, dia: "2026-09-21", estado: "Confirmada", hora: "09:00:00", listo_en: "2026-09-21T08:30:00Z" }),
      reserva({ id: 8, dia: "2026-09-21", estado: "Confirmada", hora: "11:00:00" }),
      reserva({ id: 9, dia: "2026-09-21", estado: "Confirmada", hora: "12:00:00", creada_por: "taller" }),
    ];
    expect(resumenCabecera(hoyTres, ahora)).toEqual({ porTerminar: 2, terminadas: 1, porResponder: 0 });
    const todasListas = hoyTres.map((r) => ({ ...r, listo_en: "2026-09-21T09:00:00Z" }));
    expect(resumenCabecera(todasListas, ahora)).toEqual({ porTerminar: 0, terminadas: 3, porResponder: 0 });
  });

  it("lo dice en una línea", () => {
    expect(textoResumen({ porTerminar: 2, terminadas: 1, porResponder: 1 })).toBe("Hoy: 2 por terminar · 1 por responder");
    expect(textoResumen({ porTerminar: 1, terminadas: 0, porResponder: 0 })).toBe("Hoy: 1 por terminar · todo al día");
    expect(textoResumen({ porTerminar: 0, terminadas: 3, porResponder: 0 })).toBe("Hoy: todo terminado · todo al día");
    expect(textoResumen({ porTerminar: 0, terminadas: 0, porResponder: 1 })).toBe("Hoy: sin citas · 1 por responder");
  });
});

describe("marcas de hecho en la tarjeta", () => {
  // Instantes construidos en hora local, como los ve el panel (hoy es el 21).
  const alas = (dia: number, h: number, m: number) => new Date(2026, 8, dia, h, m).toISOString();

  it("vehículo listo: a qué hora, y el día si no fue hoy", () => {
    expect(textoLista(alas(21, 12, 30), true, ahora)).toBe("✓ Lista · avisado a las 12:30");
    expect(textoLista(alas(21, 9, 5), false, ahora)).toBe("✓ Lista a las 09:05");
    expect(textoLista(alas(18, 8, 0), true, ahora)).toBe("✓ Lista · avisado el 18/09 a las 08:00");
  });

  it("avisos de WhatsApp: solo si ya se mandaron", () => {
    const confirmada = reserva({ id: 1, dia: "2026-09-24", estado: "Confirmada" });
    expect(marcaAviso(confirmada, "confirmacion", ahora)).toBeNull();
    const avisada = conAviso(confirmada, "confirmacion", alas(21, 9, 40));
    expect(marcaAviso(avisada, "confirmacion", ahora)).toBe("✓ Confirmación avisada a las 09:40");
    expect(marcaAviso(avisada, "recordatorio", ahora)).toBeNull();
    expect(marcaAviso(conAviso(confirmada, "recordatorio", alas(20, 19, 5)), "recordatorio", ahora)).toBe("✓ Recordatorio enviado el 20/09 a las 19:05");
    // Mandado por la API antes de guardar la hora: sin hora.
    expect(marcaAviso({ ...confirmada, estado: "Cancelada", whatsapp_cancelacion_enviada: true }, "cancelacion", ahora)).toBe("✓ Cancelación avisada");
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
