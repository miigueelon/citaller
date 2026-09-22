// Tarjeta de mostrador y cartel de puerta de cada taller: logo de CiTaller, nombre del taller,
// "Reserva tu cita", su QR y la dirección escrita. El mismo diseño en dos tamaños:
//   clientes/<slug>/assets/tarjeta-mostrador.pdf  A6 vertical (105 × 148 mm), para el mostrador
//   clientes/<slug>/assets/cartel-puerta.pdf      A4 vertical (210 × 297 mm), para la puerta o la vitrina
//   (y un .png de vista previa de cada uno)
// Uso: node scripts/tarjeta-mostrador.mjs [slug ...]   (sin argumentos: todos los talleres salvo _plantilla y e2e)
// Necesita el QR del taller (node scripts/qr.mjs) y lee su nombre de la vista pública de Supabase
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY de .env.local); si no puede, usa el slug.
/* global document */ // dentro de page.evaluate() el código corre en el navegador
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const carpetaClientes = join(raiz, "clientes");
const logo = `data:image/png;base64,${readFileSync(join(raiz, "src/assets/logo.png")).toString("base64")}`;

// Cómo quiere cada taller su nombre en la tarjeta (se imprime en mayúsculas). Si un taller no está
// aquí, se usa el nombre de la web.
const NOMBRES_TARJETA = { speedbikes: "Speed Bikes", rikandroll: "Rik and Roll" };

// Tamaños: el A4 es exactamente el doble del A6 en cada lado, así que el diseño solo se escala (--k).
const TAMANOS = [
  { archivo: "tarjeta-mostrador", k: 1, ancho: 105, alto: 148, viewport: { width: 397, height: 559 }, escala: 3 },
  { archivo: "cartel-puerta", k: 2, ancho: 210, alto: 297, viewport: { width: 794, height: 1123 }, escala: 2 },
];

const env = Object.fromEntries(
  (existsSync(join(raiz, ".env.local")) ? readFileSync(join(raiz, ".env.local"), "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

async function nombreDelTaller(slug) {
  try {
    const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/talleres_publicos?slug=eq.${slug}&select=nombre`, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
    });
    const filas = await r.json();
    if (filas[0]?.nombre) return filas[0].nombre;
  } catch {
    /* sin red o sin claves: se usa el slug */
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function html(nombre, qrSvg, direccion, { k, ancho, alto }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${nombre}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=block" rel="stylesheet">
<style>
  :root { --k: ${k}; }
  @page { size: ${ancho}mm ${alto}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: ${ancho}mm; height: ${alto}mm; font-family: Arial, Helvetica, sans-serif; color: #16233a; }
  .tarjeta { box-sizing: border-box; width: ${ancho}mm; height: ${alto}mm; padding: calc(6mm * var(--k)) calc(8mm * var(--k));
             border-top: calc(4mm * var(--k)) solid #ff6b00; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .logo { width: calc(44mm * var(--k)); height: auto; margin-top: calc(1mm * var(--k)); }
  .taller { margin: calc(4mm * var(--k)) 0 0; font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: calc(21pt * var(--k));
            font-weight: 800; line-height: 1.1; letter-spacing: calc(1.2pt * var(--k)); text-transform: uppercase; }
  .raya { width: calc(12mm * var(--k)); height: calc(1.1mm * var(--k)); margin: calc(2.2mm * var(--k)) 0 calc(3.2mm * var(--k));
          border-radius: calc(1mm * var(--k)); background: #ff6b00; }
  .reserva { margin: 0; padding: calc(2.4mm * var(--k)) calc(8mm * var(--k)); border-radius: calc(10mm * var(--k)); background: #ff6b00; color: #fff;
             font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: calc(13pt * var(--k)); font-weight: 700; letter-spacing: calc(0.3pt * var(--k)); }
  .qr { width: calc(48mm * var(--k)); height: calc(48mm * var(--k)); margin: calc(4.5mm * var(--k)) 0 calc(2.5mm * var(--k)); }
  .qr svg { display: block; width: 100%; height: 100%; }
  .pista { margin: 0; font-size: calc(8.5pt * var(--k)); color: #6b7280; }
  .direccion { margin: calc(3.2mm * var(--k)) 0 0; padding: calc(2.4mm * var(--k)) calc(6mm * var(--k)); border-radius: calc(3mm * var(--k));
               background: #fff3eb; color: #16233a; font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: calc(12pt * var(--k)); font-weight: 700; }
</style></head>
<body><div class="tarjeta">
  <img class="logo" src="${logo}" alt="CiTaller">
  <h1 class="taller">${nombre}</h1>
  <div class="raya"></div>
  <p class="reserva">Reserva tu cita</p>
  <div class="qr">${qrSvg}</div>
  <p class="pista">Escanea el código con la cámara del móvil</p>
  <p class="direccion">${direccion}</p>
</div></body></html>`;
}

const pedidos = process.argv.slice(2);
const slugs = pedidos.length > 0 ? pedidos : readdirSync(carpetaClientes, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "e2e").map((d) => d.name);

const navegador = await chromium.launch();
for (const slug of slugs) {
  const assets = join(carpetaClientes, slug, "assets");
  const qr = join(assets, "qr-reserva.svg");
  if (!existsSync(qr)) {
    console.error(`${slug}: falta ${qr} (ejecuta node scripts/qr.mjs ${slug})`);
    continue;
  }
  const nombre = NOMBRES_TARJETA[slug] ?? (await nombreDelTaller(slug));
  for (const tamano of TAMANOS) {
    const pagina = await navegador.newPage({ viewport: tamano.viewport, deviceScaleFactor: tamano.escala });
    await pagina.setContent(html(nombre, readFileSync(qr, "utf8"), `citaller.es/${slug}`, tamano), { waitUntil: "load" });
    await pagina.evaluate(() => document.fonts.ready);
    if (!(await pagina.evaluate(() => document.fonts.check('800 20pt "Montserrat"')))) console.warn(`${slug}: sin Montserrat (¿sin red?); se usa la fuente del sistema`);
    await pagina.pdf({ path: join(assets, `${tamano.archivo}.pdf`), width: `${tamano.ancho}mm`, height: `${tamano.alto}mm`, printBackground: true });
    writeFileSync(join(assets, `${tamano.archivo}.png`), await pagina.screenshot({ type: "png" }));
    await pagina.close();
    console.log(`${slug}: ${tamano.archivo} (${tamano.ancho} × ${tamano.alto} mm) de "${nombre}" → clientes/${slug}/assets/${tamano.archivo}.{pdf,png}`);
  }
}
await navegador.close();
