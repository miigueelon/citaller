import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { afterAll, describe, expect, it } from "vitest";
import { generarQr, urlReserva } from "./qr.mjs";

// El QR impreso tiene que llevar exactamente la URL pública del taller: se genera en una carpeta
// temporal y se decodifica el PNG.
const carpeta = mkdtempSync(join(tmpdir(), "citaller-qr-"));
afterAll(() => rmSync(carpeta, { recursive: true, force: true }));

describe("scripts/qr.mjs", () => {
  it("la URL de reserva es la base más el slug", () => {
    expect(urlReserva("speedbikes")).toMatch(/^https:\/\/[^/]+\/speedbikes$/);
  });

  it("genera SVG y PNG, y el PNG decodifica a la URL exacta", async () => {
    const url = await generarQr("rikandroll", carpeta);
    expect(existsSync(join(carpeta, "qr-reserva.svg"))).toBe(true);
    expect(readFileSync(join(carpeta, "qr-reserva.svg"), "utf8")).toContain("<svg");

    const png = PNG.sync.read(readFileSync(join(carpeta, "qr-reserva.png")));
    const leido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(leido?.data).toBe(url);
    expect(url).toBe(urlReserva("rikandroll"));
  });
});
