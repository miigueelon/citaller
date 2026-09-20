import { describe, expect, it } from "vitest";
import type { ReservaPanel } from "./tipos";
import { datosDeReserva, enlaceWhatsapp, rellenarPlantilla, TEXTOS_VACIOS, textoMensaje, tipoMensajeDeReserva } from "./textosWhatsapp";

const reserva: ReservaPanel = {
  id: 7,
  taller_id: 3,
  nombre: "Ana",
  telefono: "34600111222",
  matricula: "1234ABC",
  vehiculo: "Seat Ibiza",
  servicio: "Frenos",
  descripcion: null,
  datos_extra: {},
  estado: "Confirmada",
  dia: "2026-09-21",
  hora: "10:00:00",
  creada_por: "cliente",
  cancelada_por: null,
  cancelada_en: null,
  confirmada_en: null,
  token_publico: "11111111-2222-3333-4444-555555555555",
  whatsapp_confirmacion_enviada: false,
  whatsapp_cancelacion_enviada: false,
  whatsapp_error: null,
  google_event_id: null,
  google_error: null,
};

const taller = { nombre: "Taller de pruebas", slug: "e2e" };
const datos = datosDeReserva(reserva, taller, "https://citaller.vercel.app");

describe("rellenarPlantilla", () => {
  it("sustituye los marcadores con la fecha y la hora legibles", () => {
    expect(rellenarPlantilla("{nombre} {dia} {hora} {enlace_cita}", datos)).toBe(
      "Ana lunes, 21 de septiembre 10:00 https://citaller.vercel.app/e2e/cita/11111111-2222-3333-4444-555555555555",
    );
  });

  it("deja vacíos los marcadores desconocidos sin romper el texto", () => {
    expect(rellenarPlantilla("Hola {nombre} {inventado}!", datos)).toBe("Hola Ana !");
  });
});

describe("textoMensaje", () => {
  it("usa el texto por defecto cuando el taller no tiene uno", () => {
    const texto = textoMensaje("confirmacion", TEXTOS_VACIOS, datos);
    expect(texto).toContain("Taller de pruebas");
    expect(texto).toContain("lunes, 21 de septiembre");
    expect(texto).toContain("/e2e/cita/");
  });

  it("prefiere el texto del taller", () => {
    const texto = textoMensaje("recordatorio", { ...TEXTOS_VACIOS, recordatorio: "Mañana a las {hora}, {nombre}." }, datos);
    expect(texto).toBe("Mañana a las 10:00, Ana.");
  });

  it("un texto del taller en blanco cuenta como no tenerlo", () => {
    expect(textoMensaje("cancelacion", { ...TEXTOS_VACIOS, cancelacion: "   " }, datos)).toContain("cancelar tu cita");
  });
});

describe("enlaceWhatsapp", () => {
  it("apunta a wa.me con el teléfono limpio y el texto codificado", () => {
    expect(enlaceWhatsapp("+34 600 111 222", "Hola ¿qué tal?")).toBe("https://wa.me/34600111222?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
  });
});

describe("tipoMensajeDeReserva", () => {
  it("confirmada → confirmación, o recordatorio si se pide", () => {
    expect(tipoMensajeDeReserva(reserva)).toBe("confirmacion");
    expect(tipoMensajeDeReserva(reserva, true)).toBe("recordatorio");
  });

  it("cancelada por el taller → cancelación; por el cliente → nada", () => {
    expect(tipoMensajeDeReserva({ ...reserva, estado: "Cancelada", cancelada_por: "taller" })).toBe("cancelacion");
    expect(tipoMensajeDeReserva({ ...reserva, estado: "Cancelada", cancelada_por: "cliente" })).toBeNull();
  });

  it("sin teléfono o pendiente → nada", () => {
    expect(tipoMensajeDeReserva({ ...reserva, telefono: null })).toBeNull();
    expect(tipoMensajeDeReserva({ ...reserva, estado: "Pendiente" })).toBeNull();
  });
});
