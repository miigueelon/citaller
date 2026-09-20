import { defineConfig, devices } from "@playwright/test";

// Pruebas de humo de extremo a extremo contra el taller de pruebas `e2e` (id 3).
// Base por defecto: el servidor de desarrollo local. Contra un preview de Vercel:
//   E2E_BASE_URL=https://citaller-xxxx-miigueelon.vercel.app npm run e2e
// Credenciales del taller de pruebas: E2E_TALLER_EMAIL y E2E_TALLER_PASSWORD en .env.local.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
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
