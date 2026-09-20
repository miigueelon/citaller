import { expect, test } from "@playwright/test";
import { TALLER_E2E } from "./entorno";

// Humo del flujo público de reserva sobre el taller de pruebas.
// Hasta la fase 2b la URL es ?taller=N; después será /<slug>. Se mantiene aquí en un solo sitio.
const URL_RESERVA = `/${TALLER_E2E.slug}`;

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

test.describe("URLs antiguas", () => {
  test("?taller=N redirige a la dirección con slug", async ({ page }) => {
    await page.goto(`/?taller=${TALLER_E2E.id}`);
    await expect(page).toHaveURL(new RegExp(`/${TALLER_E2E.slug}$`));
    await expect(page.getByText(TALLER_E2E.nombre)).toBeVisible();
  });

  test("?taller=N&modo=taller redirige al panel", async ({ page }) => {
    await page.goto(`/?taller=${TALLER_E2E.id}&modo=taller`);
    await expect(page).toHaveURL(new RegExp(`/${TALLER_E2E.slug}/panel$`));
  });

  test("un slug inexistente muestra la página de no encontrado", async ({ page }) => {
    await page.goto("/taller-que-no-existe");
    await expect(page.getByText(/no encontramos ningún taller/i)).toBeVisible();
  });
});

test.describe("Pasos de la reserva", () => {
  test("con los datos rellenos se llega al calendario y se elige día", async ({ page }) => {
    await page.goto(URL_RESERVA);
    await expect(page.getByText(TALLER_E2E.nombre)).toBeVisible();

    await page.locator('input[name="matricula"]').fill("E2E1234");
    await page.locator('input[name="vehiculo"]').fill("Coche de prueba");
    await page.locator('input[name="nombre"]').fill("Cliente de prueba");
    await page.locator('input[name="telefono"]').fill("600111222");
    await page.locator("#servicio").selectOption("Revisión / mantenimiento");

    const continuar = page.getByRole("button", { name: /continuar/i });
    await expect(continuar).toBeEnabled();
    await continuar.click();

    await expect(page.getByRole("heading", { name: /elige fecha y hora/i })).toBeVisible();
    // Al menos un día laborable de las próximas semanas tiene que poder pulsarse.
    const diasHabilitados = page.locator(".react-calendar__month-view__days button:not([disabled])");
    await expect(diasHabilitados.first()).toBeVisible();
    await diasHabilitados.first().click();
    await expect(page.getByRole("heading", { name: /horas disponibles/i })).toBeVisible();
  });
});
