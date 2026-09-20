import { expect, test } from "@playwright/test";
import { crearReservaDePrueba, TALLER_E2E } from "./entorno";

// Enlace de la cita del cliente (/<slug>/cita/<token>): ver la cita y cancelarla.
// La reserva se crea por la RPC pública con un teléfono aleatorio para no chocar con los límites
// por teléfono, y queda cancelada al final (los datos del taller e2e se pueden crear y borrar).

test.describe("Cita del cliente", () => {
  test("un enlace inventado dice que no encuentra la cita", async ({ page }) => {
    await page.goto(`/${TALLER_E2E.slug}/cita/00000000-0000-4000-8000-000000000000`);
    await expect(page.getByText(/no encontramos ninguna cita/i)).toBeVisible();
  });

  test("un enlace mal formado también", async ({ page }) => {
    await page.goto(`/${TALLER_E2E.slug}/cita/esto-no-es-un-token`);
    await expect(page.getByText(/no encontramos ninguna cita/i)).toBeVisible();
  });

  test("el cliente ve su cita y la cancela desde el enlace", async ({ page }) => {
    const creada = await crearReservaDePrueba({ nombre: "Cliente Playwright" });

    await page.goto(`/${TALLER_E2E.slug}/cita/${creada.token}`);
    await expect(page.getByRole("heading", { name: new RegExp(`Tu cita en ${TALLER_E2E.nombre}`) })).toBeVisible();
    await expect(page.getByText("Cliente Playwright")).toBeVisible();
    await expect(page.getByText(/pendiente de confirmar/i)).toBeVisible();
    // El teléfono del cliente nunca aparece en esta página.
    await expect(page.getByText(creada.telefono.slice(-9))).toHaveCount(0);

    await page.getByRole("button", { name: /cancelar mi cita/i }).click();
    await page.getByRole("button", { name: /sí, cancelar/i }).click();

    await expect(page.getByText(/ha quedado cancelada/i)).toBeVisible();
    await expect(page.getByText(/cancelada por ti/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /pedir otra cita/i })).toBeVisible();

    // Al recargar, sigue cancelada y ya no hay botón.
    await page.reload();
    await expect(page.getByText(/cancelada por ti/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar mi cita/i })).toHaveCount(0);
  });
});
