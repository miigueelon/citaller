import { defineConfig, devices } from "@playwright/test";
import { ESTADO_BYPASS } from "./tests/e2e/preparar";

// Pruebas de humo de extremo a extremo contra el taller de pruebas `e2e` (id 3).
// Base por defecto: el servidor de desarrollo local. Contra un preview de Vercel:
//   E2E_BASE_URL=https://citaller-xxxx-miigueelon.vercel.app npm run e2e
// Credenciales del taller de pruebas: E2E_TALLER_EMAIL y E2E_TALLER_PASSWORD en .env.local.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

// Los previews de Vercel están protegidos. tests/e2e/preparar.ts cambia el secreto
// "Protection Bypass for Automation" (E2E_BYPASS_SECRET, nunca en el repo) por una cookie de acceso
// antes de empezar; ahí está explicado por qué no se usa la cabecera en cada petición.
const conPreview = Boolean(process.env.E2E_BASE_URL && process.env.E2E_BYPASS_SECRET);

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/preparar.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // globalSetup escribe este fichero antes de los tests (y falla si no lo consigue).
    storageState: conPreview ? ESTADO_BYPASS : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
