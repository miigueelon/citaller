import { expect, test } from "@playwright/test";
import { requiereCredenciales, TALLER_E2E } from "./entorno";

// Humo del panel del taller de pruebas: login y carga de reservas.
const URL_PANEL = `/?taller=${TALLER_E2E.id}&modo=taller`;

test.describe("Panel del taller", () => {
  test.beforeAll(() => requiereCredenciales());

  test("entra con las credenciales del taller de pruebas y ve su panel", async ({ page }) => {
    await page.goto(URL_PANEL);
    await page.getByPlaceholder(/email|correo/i).fill(TALLER_E2E.email);
    await page.getByPlaceholder(/contraseña|password/i).fill(TALLER_E2E.password);
    await page.getByRole("button", { name: /entrar|iniciar|acceder/i }).click();
    await expect(page.getByText(new RegExp(`Panel.*${TALLER_E2E.nombre}`))).toBeVisible();
    await expect(page.getByRole("button", { name: /conectar google calendar/i })).toBeVisible();
  });

  test("con una contraseña incorrecta no entra", async ({ page }) => {
    await page.goto(URL_PANEL);
    await page.getByPlaceholder(/email|correo/i).fill(TALLER_E2E.email);
    await page.getByPlaceholder(/contraseña|password/i).fill("incorrecta-123");
    await page.getByRole("button", { name: /entrar|iniciar|acceder/i }).click();
    await expect(page.getByText(new RegExp(`Panel.*${TALLER_E2E.nombre}`))).not.toBeVisible();
  });
});
