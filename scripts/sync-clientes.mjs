// Copia los assets de cada cliente (clientes/<slug>/assets/*) a public/clientes/<slug>/ para que
// Vite los sirva en /clientes/<slug>/<fichero>. `public/clientes/` está en .gitignore: la fuente
// de verdad es clientes/. Se ejecuta antes de `dev` y `build` (npm pre-scripts).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const origen = join(raiz, "clientes");
const destino = join(raiz, "public", "clientes");

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

let copiados = 0;
for (const carpeta of readdirSync(origen, { withFileTypes: true })) {
  if (!carpeta.isDirectory() || carpeta.name.startsWith("_")) continue;
  const assets = join(origen, carpeta.name, "assets");
  if (!existsSync(assets)) continue;
  cpSync(assets, join(destino, carpeta.name), { recursive: true });
  copiados++;
}
console.log(`sync-clientes: assets de ${copiados} cliente(s) en public/clientes/`);
