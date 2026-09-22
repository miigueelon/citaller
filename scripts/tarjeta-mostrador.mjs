// Tarjeta de mostrador de cada taller (A6 vertical, 105 × 148 mm): logo de CiTaller, nombre del
// taller, "Reserva tu cita", su QR y la dirección escrita.
//   clientes/<slug>/assets/tarjeta-mostrador.pdf  (para imprimir)  y  tarjeta-mostrador.png (vista previa)
// Uso: node scripts/tarjeta-mostrador.mjs [slug ...]   (sin argumentos: todos los talleres salvo _plantilla y e2e)
// Necesita el QR del taller (node scripts/qr.mjs) y lee su nombre de la vista pública de Supabase
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY de .env.local); si no puede, usa el slug.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const carpetaClientes = join(raiz, "clientes");
const logo = `data:image/png;base64,${readFileSync(join(raiz, "src/assets/logo.png")).toString("base64")}`;

// Cómo quiere cada taller su nombre en la tarjeta (se imprime en mayúsculas). Si un taller no está
// aquí, se usa el nombre de la web.
const NOMBRES_TARJETA = { speedbikes: "Speed Bikes", rikandroll: "Rik and Roll" };

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

function html(nombre, qrSvg, direccion) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Tarjeta ${nombre}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=block" rel="stylesheet">
<style>
  @page { size: 105mm 148mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: 105mm; height: 148mm; font-family: Arial, Helvetica, sans-serif; color: #16233a; }
  .tarjeta { box-sizing: border-box; width: 105mm; height: 148mm; padding: 6mm 8mm 6mm; border-top: 4mm solid #ff6b00;
             display: flex; flex-direction: column; align-items: center; text-align: center; }
  .logo { width: 44mm; height: auto; margin-top: 1mm; }
  .taller { margin: 4mm 0 0; font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: 21pt; font-weight: 800;
            line-height: 1.1; letter-spacing: 1.2pt; text-transform: uppercase; }
  .raya { width: 12mm; height: 1.1mm; margin: 2.2mm 0 3.2mm; border-radius: 1mm; background: #ff6b00; }
  .reserva { margin: 0; padding: 2.4mm 8mm; border-radius: 10mm; background: #ff6b00; color: #fff;
             font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: 13pt; font-weight: 700; letter-spacing: 0.3pt; }
  .qr { width: 48mm; height: 48mm; margin: 4.5mm 0 2.5mm; }
  .qr svg { display: block; width: 100%; height: 100%; }
  .pista { margin: 0; font-size: 8.5pt; color: #6b7280; }
  .direccion { margin: 3.2mm 0 0; padding: 2.4mm 6mm; border-radius: 3mm; background: #fff3eb; color: #16233a;
               font-family: "Montserrat", "Segoe UI", Arial, sans-serif; font-size: 12pt; font-weight: 700; }
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
  const pagina = await navegador.newPage({ viewport: { width: 397, height: 559 }, deviceScaleFactor: 3 });
  await pagina.setContent(html(nombre, readFileSync(qr, "utf8"), `citaller.es/${slug}`), { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);
  if (!(await pagina.evaluate(() => document.fonts.check('800 20pt "Montserrat"')))) console.warn(`${slug}: sin Montserrat (¿sin red?); se usa la fuente del sistema`);
  await pagina.pdf({ path: join(assets, "tarjeta-mostrador.pdf"), width: "105mm", height: "148mm", printBackground: true });
  writeFileSync(join(assets, "tarjeta-mostrador.png"), await pagina.screenshot({ type: "png" }));
  await pagina.close();
  console.log(`${slug}: tarjeta de "${nombre}" → clientes/${slug}/assets/tarjeta-mostrador.{pdf,png}`);
}
await navegador.close();
