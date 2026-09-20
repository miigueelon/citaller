// Capturas de pantalla de las pantallas principales contra el taller de pruebas, para comparar
// el aspecto antes y después de un cambio de estilos. Uso: node scripts/capturas.mjs <carpeta>
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const carpeta = resolve(process.argv[2] ?? "capturas");
mkdirSync(carpeta, { recursive: true });

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const slug = "e2e";

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES" });
const pagina = await contexto.newPage();

async function capturar(nombre) {
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: resolve(carpeta, `${nombre}.png`), fullPage: true });
  console.log("captura:", nombre);
}

// 1. Formulario de reserva
await pagina.goto(`${base}/${slug}`);
await pagina.getByText("Taller de pruebas e2e").waitFor();
await capturar("1-reserva-datos");

// 2. Con neumáticos no aplica al taller e2e; se rellena y se pasa al calendario
await pagina.locator('input[name="matricula"]').fill("E2E1234");
await pagina.locator('input[name="vehiculo"]').fill("Coche de prueba");
await pagina.locator('input[name="nombre"]').fill("Cliente de prueba");
await pagina.locator('input[name="telefono"]').fill("600111222");
await pagina.locator("#servicio").selectOption("Otro");
await pagina.locator("#descripcion").fill("Revisar el aire acondicionado");
await capturar("2-reserva-datos-rellenos");
await pagina.getByRole("button", { name: /continuar/i }).click();
await pagina.getByRole("heading", { name: /elige fecha y hora/i }).waitFor();
const dia = pagina.locator(".react-calendar__month-view__days button:not([disabled])").first();
await dia.click();
await pagina.getByRole("heading", { name: /horas disponibles/i }).waitFor();
await pagina.waitForTimeout(800);
await capturar("3-reserva-fecha-hora");

// 3. Panel: login y lista
await pagina.goto(`${base}/${slug}/panel`);
await capturar("4-panel-login");
await pagina.getByPlaceholder(/email/i).fill(env.E2E_TALLER_EMAIL);
await pagina.getByPlaceholder(/contraseña/i).fill(env.E2E_TALLER_PASSWORD);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByRole("button", { name: /conectar google calendar/i }).waitFor();
await pagina.waitForTimeout(800);
await capturar("5-panel");
await pagina.getByRole("button", { name: /confirmadas/i }).click();
await capturar("6-panel-confirmadas");

// Móvil
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.goto(`${base}/${slug}`);
await pagina.getByText("Taller de pruebas e2e").waitFor();
await capturar("7-movil-reserva");
await pagina.goto(`${base}/${slug}/panel`);
await pagina.getByRole("button", { name: /conectar google calendar/i }).waitFor();
await pagina.waitForTimeout(500);
await capturar("8-movil-panel");

await navegador.close();
