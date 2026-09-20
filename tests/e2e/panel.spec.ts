import { expect, test, type Page } from "@playwright/test";
import { crearReservaDePrueba, proximoDiaLaborable, requiereCredenciales, TALLER_E2E } from "./entorno";

// Panel del taller de pruebas: login, reservas, confirmar/cancelar por Edge Functions y cita manual.
const URL_PANEL = `/${TALLER_E2E.slug}/panel`;

async function entrar(page: Page) {
  await page.goto(URL_PANEL);
  await page.getByPlaceholder(/email|correo/i).fill(TALLER_E2E.email);
  await page.getByPlaceholder(/contraseña|password/i).fill(TALLER_E2E.password);
  await page.getByRole("button", { name: /entrar|iniciar|acceder/i }).click();
  await expect(page.getByText(new RegExp(`Panel.*${TALLER_E2E.nombre}`))).toBeVisible();
}

test.describe("Panel del taller", () => {
  test.beforeAll(() => requiereCredenciales());

  test("entra con las credenciales del taller de pruebas y ve su panel", async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole("button", { name: /conectar google calendar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /nueva cita/i })).toBeVisible();
  });

  test("con una contraseña incorrecta no entra", async ({ page }) => {
    await page.goto(URL_PANEL);
    await page.getByPlaceholder(/email|correo/i).fill(TALLER_E2E.email);
    await page.getByPlaceholder(/contraseña|password/i).fill("incorrecta-123");
    await page.getByRole("button", { name: /entrar|iniciar|acceder/i }).click();
    await expect(page.getByText(new RegExp(`Panel.*${TALLER_E2E.nombre}`))).not.toBeVisible();
  });

  test("confirma una solicitud y después la cancela", async ({ page }) => {
    const creada = await crearReservaDePrueba({ nombre: "Cliente Confirmar", hora: "09:00" });
    await entrar(page);

    const tarjeta = page.locator(".tarjeta-reserva", { hasText: "Cliente Confirmar" }).first();
    await expect(tarjeta).toBeVisible();
    // La tarjeta enseña el campo extra del taller con su etiqueta.
    await expect(tarjeta.getByText(/kilómetros/i)).toBeVisible();

    await tarjeta.getByRole("button", { name: /confirmar/i }).click();
    await expect(page.getByText(/cita confirmada/i)).toBeVisible();

    await page.getByRole("button", { name: /^Confirmadas/ }).click();
    const confirmada = page.locator(".tarjeta-reserva", { hasText: "Cliente Confirmar" }).first();
    await expect(confirmada.getByText("Confirmada", { exact: true })).toBeVisible();

    await confirmada.getByRole("button", { name: /cancelar cita/i }).click();
    await page.getByRole("button", { name: /sí, cancelar la cita/i }).click();
    await expect(page.getByText(/cita cancelada/i)).toBeVisible();

    await page.getByRole("button", { name: /^Canceladas/ }).click();
    await expect(page.locator(".tarjeta-reserva", { hasText: "Cliente Confirmar" }).first()).toBeVisible();
    void creada;
  });

  test("apunta una cita a mano sin teléfono y nace confirmada", async ({ page }) => {
    // Nombre distinto en cada ejecución: si una prueba anterior se cortó antes de limpiar, su
    // cita sigue en el panel y la tarjeta buscada tiene que ser la de ahora.
    const nombre = `Cliente Mostrador ${String(Date.now()).slice(-5)}`;
    await entrar(page);
    await page.getByRole("button", { name: /nueva cita/i }).click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByRole("heading", { name: /apuntar una cita/i })).toBeVisible();
    await dialogo.locator('input[name="nombre"]').fill(nombre);
    await dialogo.locator('input[name="matricula"]').fill("9999ZZZ");
    await dialogo.locator('input[name="vehiculo"]').fill("Furgoneta");
    await dialogo.locator('select[name="servicio"]').selectOption("Frenos");
    await dialogo.locator('input[name="dia"]').fill(proximoDiaLaborable(3));
    await dialogo.locator('input[name="hora"]').fill("10:00");
    await dialogo.getByRole("button", { name: /guardar cita confirmada/i }).click();

    await expect(page.getByText(/cita confirmada/i)).toBeVisible();
    await page.getByRole("button", { name: /^Confirmadas/ }).click();
    const tarjeta = page.locator(".tarjeta-reserva", { hasText: nombre }).first();
    await expect(tarjeta).toBeVisible();
    // La etiqueta de origen, no el nombre del cliente (que también dice "Mostrador").
    await expect(tarjeta.locator(".tarjeta-origen")).toHaveText(/mostrador/i);
    await expect(tarjeta.getByText(/sin teléfono/i)).toBeVisible();

    // Limpieza: se cancela para no dejar huecos ocupados en el taller de pruebas.
    await tarjeta.getByRole("button", { name: /cancelar cita/i }).click();
    await page.getByRole("button", { name: /sí, cancelar la cita/i }).click();
    await expect(page.getByText(/cita cancelada/i)).toBeVisible();
  });
});
