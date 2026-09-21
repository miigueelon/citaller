// Genera el código QR de reserva de cada taller (para el mostrador y el material impreso):
//   clientes/<slug>/assets/qr-reserva.svg y qr-reserva.png  →  <CITALLER_APP_URL>/<slug>
// Uso: node scripts/qr.mjs [slug ...]   (sin argumentos: todos los talleres de clientes/ salvo _plantilla y e2e)
// La URL base sale de CITALLER_APP_URL (por defecto https://citaller.es). Los QR de clientes/ ya codifican
// citaller.es; si cambiara el dominio, volver a ejecutarlo (los impresos valen mientras la URL vieja redirija).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const carpetaClientes = join(raiz, "clientes");

export const URL_BASE = (process.env.CITALLER_APP_URL ?? "https://citaller.es").replace(/\/+$/, "");

export function urlReserva(slug) {
  return `${URL_BASE}/${slug}`;
}

/** Genera los dos ficheros del QR de un taller. Devuelve la URL codificada. */
export async function generarQr(slug, carpeta = join(carpetaClientes, slug, "assets")) {
  const url = urlReserva(slug);
  mkdirSync(carpeta, { recursive: true });
  const opciones = { errorCorrectionLevel: "M", margin: 2 };
  writeFileSync(join(carpeta, "qr-reserva.svg"), await QRCode.toString(url, { ...opciones, type: "svg" }));
  writeFileSync(join(carpeta, "qr-reserva.png"), await QRCode.toBuffer(url, { ...opciones, type: "png", width: 1024 }));
  return url;
}

function talleresDelRepo() {
  return readdirSync(carpetaClientes, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "e2e" && existsSync(join(carpetaClientes, d.name, "seed.sql")))
    .map((d) => d.name);
}

const esPrincipal = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (esPrincipal) {
  const slugs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : talleresDelRepo();
  for (const slug of slugs) {
    const url = await generarQr(slug);
    console.log(`qr: clientes/${slug}/assets/qr-reserva.{svg,png} → ${url}`);
  }
}
