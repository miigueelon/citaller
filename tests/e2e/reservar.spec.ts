import { expect, test } from "@playwright/test";
import { TALLER_E2E } from "./entorno";

// Humo del flujo público de reserva sobre el taller de pruebas.
// Hasta la fase 2b la URL es ?taller=N; después será /<slug>. Se mantiene aquí en un solo sitio.
const URL_RESERVA = `/?taller=${TALLER_E2E.id}`;

test.describe("Reservar (público)", () => {
  test("la página del taller de pruebas carga con sus datos", async ({ page }) => {
    await page.goto(URL_RESERVA);
    await expect(page.getByText(TALLER_E2E.nombre)).toBeVisible();
  });

  test("el formulario exige los datos obligatorios antes de continuar", async ({ page }) => {
    await page.goto(URL_RESERVA);
    await expect(page.getByText(TALLER_E2E.nombre)).toBeVisible();
    const continuar = page.getByRole("button", { name: /continuar/i });
    await expect(continuar).toBeDisabled();
  });
});
