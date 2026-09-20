// Comprime las imágenes de src/assets sin cambiar su nombre: PNG optimizado y, si la imagen es
// más ancha que el máximo, reducida. Uso: node scripts/optimizar-imagenes.mjs
import { readdirSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const carpeta = new URL("../src/assets/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ANCHO_MAXIMO = { "logo.png": 480, "guia_neumatico.png": 1040 };

for (const nombre of readdirSync(carpeta)) {
  if (!nombre.endsWith(".png")) continue;
  const ruta = join(carpeta, nombre);
  const antes = statSync(ruta).size;
  const imagen = sharp(ruta);
  const meta = await imagen.metadata();
  const anchoMaximo = ANCHO_MAXIMO[nombre] ?? 1200;
  const temporal = `${ruta}.tmp`;

  await imagen
    .resize({ width: Math.min(meta.width ?? anchoMaximo, anchoMaximo), withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(temporal);

  renameSync(temporal, ruta);
  const despues = statSync(ruta).size;
  console.log(`${nombre}: ${(antes / 1024).toFixed(0)} KB → ${(despues / 1024).toFixed(0)} KB (${meta.width}px → ${Math.min(meta.width ?? 0, anchoMaximo)}px)`);
}
