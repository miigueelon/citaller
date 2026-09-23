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
    await expect(page.getByRole("button", { name: /nueva cita/i })).toBeVisible();
    // Cabecera: citas de hoy y solicitudes por responder.
    await expect(page.locator(".panel-subtitulo")).toHaveText(/^Hoy: .+ · (todo al día|\d+ por responder)$/);
  });

  test("con Google Calendar conectado el botón lo dice, y volver a conectar pide confirmación", async ({ page }) => {
    // El taller e2e tiene Google conectado (integraciones_calendario).
    await entrar(page);
    const boton = page.getByRole("button", { name: "Google Calendar conectado" });
    await expect(boton).toBeVisible();
    await expect(page.getByRole("button", { name: /^conectar google calendar$/i })).toHaveCount(0);

    await boton.click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByRole("heading", { name: /ya está conectado/i })).toBeVisible();
    await dialogo.getByRole("button", { name: "No, volver" }).click();
    await expect(dialogo).toHaveCount(0);
    // Sigue en el panel, sin ir a Google.
    await expect(page).toHaveURL(new RegExp(`${URL_PANEL}$`));
  });

  test("los tres botones de la cabecera van en una sola fila en ordenador, sea cual sea el nombre del taller", async ({ page }) => {
    for (const ancho of [1280, 1024]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      if (ancho === 1280) await entrar(page);
      const acciones = page.locator(".panel-acciones .panel-btn");
      await expect(acciones).toHaveCount(3);
      await expect(page.getByRole("button", { name: "Google Calendar conectado" })).toBeVisible();
      const alturas = await acciones.evaluateAll((botones) => botones.map((b) => Math.round(b.getBoundingClientRect().top)));
      expect(new Set(alturas).size, `ancho ${ancho}: ${alturas.join(", ")}`).toBe(1);
    }
  });

  test("en móvil Nueva cita va primero a todo el ancho y nada se sale de la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await entrar(page);
    await expect(page.getByRole("button", { name: "Google Calendar conectado" })).toBeVisible();
    const nueva = await page.getByRole("button", { name: /nueva cita/i }).boundingBox();
    const actualizar = await page.getByRole("button", { name: /actualizar/i }).boundingBox();
    expect(nueva!.y).toBeLessThan(actualizar!.y);
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
  });

  test("la pestaña Finalizadas es el histórico: total en el botón, buscador y sin filtros de fecha", async ({ page }) => {
    await entrar(page);
    const pestana = page.getByRole("button", { name: /^Finalizadas \(\d+\)$/ });
    await expect(pestana).toBeVisible();
    await pestana.click();
    await expect(page.getByRole("button", { name: /^Próximos 7 días$/ })).toHaveCount(0);
    await expect(page.getByLabel("Buscar reservas")).toBeVisible();
    await page.getByLabel("Buscar reservas").fill("zzz-no-existe");
    await expect(page.getByText(/no hay citas finalizadas que coincidan/i)).toBeVisible();
  });

  test("busca una solicitud por el teléfono del cliente, escrito con espacios", async ({ page }) => {
    const creada = await crearReservaDePrueba({ nombre: "Cliente Teléfono", hora: "12:00" });
    await entrar(page);
    await expect(page.locator(".tarjeta-reserva", { hasText: "Cliente Teléfono" }).first()).toBeVisible();

    // Como lo dicta el cliente: sin el 34 y con espacios.
    const nacional = creada.telefono.slice(2);
    const buscador = page.getByLabel("Buscar reservas");
    await buscador.fill(`${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`);
    await expect(page.locator(".tarjeta-reserva")).toHaveCount(1);
    await expect(page.locator(".tarjeta-reserva")).toContainText("Cliente Teléfono");

    await buscador.fill("999 999 999");
    await expect(page.getByText(/no hay reservas que coincidan/i)).toBeVisible();

    // Limpieza: se cancela para no dejar el hueco ocupado (una pendiente se cancela sin preguntar).
    await buscador.fill(nacional);
    const tarjeta = page.locator(".tarjeta-reserva", { hasText: "Cliente Teléfono" }).first();
    await tarjeta.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByText(/cita cancelada/i)).toBeVisible();
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
    // El taller de pruebas tiene dos miembros: hay que decir quién la apunta.
    await dialogo.locator('select[name="miembro_id"]').selectOption({ label: "Mecánico A" });
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
    await expect(tarjeta.locator(".tarjeta-origen")).toHaveText(/mostrador · mecánico a/i);
    await expect(tarjeta.getByText(/sin teléfono/i)).toBeVisible();

    // Limpieza: se cancela para no dejar huecos ocupados en el taller de pruebas.
    await tarjeta.getByRole("button", { name: /cancelar cita/i }).click();
    await page.getByRole("button", { name: /sí, cancelar la cita/i }).click();
    await expect(page.getByText(/cita cancelada/i)).toBeVisible();
  });

  test("vehículo listo: la cita se descuenta de Hoy, pasa a Finalizadas y se puede deshacer", async ({ page }) => {
    const nombre = `Cliente Listo ${String(Date.now()).slice(-5)}`;
    await entrar(page);

    // Cita a mano para hoy a última hora (el taller no valida horario): nace confirmada y es de hoy.
    await page.getByRole("button", { name: /nueva cita/i }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.locator('select[name="miembro_id"]').selectOption({ label: "Mecánico A" });
    await dialogo.locator('input[name="nombre"]').fill(nombre);
    await dialogo.locator('input[name="matricula"]').fill("9999ZZZ");
    await dialogo.locator('input[name="vehiculo"]').fill("Furgoneta");
    await dialogo.locator('select[name="servicio"]').selectOption("Frenos");
    await dialogo.locator('input[name="dia"]').fill(hoyLocal());
    await dialogo.locator('input[name="hora"]').fill("23:59");
    await dialogo.getByRole("button", { name: /guardar cita confirmada/i }).click();
    await expect(page.getByText(/cita confirmada/i)).toBeVisible();

    await page.getByRole("button", { name: /^Confirmadas/ }).click();
    const tarjeta = page.locator(".tarjeta-reserva", { hasText: nombre }).first();
    await expect(tarjeta).toBeVisible();

    const subtitulo = page.locator(".panel-subtitulo");
    await expect(subtitulo).toHaveText(/^Hoy: \d+ por terminar/);
    const porTerminar = Number(/Hoy: (\d+) por terminar/.exec((await subtitulo.textContent()) ?? "")?.[1]);

    const finalizadas = Number(/\((\d+)\)/.exec((await page.getByRole("button", { name: /^Finalizadas/ }).textContent()) ?? "")?.[1]);

    // El taller e2e no tiene WhatsApp: el botón solo termina la cita, que sale de Confirmadas.
    await tarjeta.getByRole("button", { name: /^Vehículo listo$/ }).click();
    await expect(subtitulo).toHaveText(porTerminar === 1 ? /^Hoy: todo terminado/ : new RegExp(`^Hoy: ${porTerminar - 1} por terminar`));
    await expect(page.locator(".tarjeta-reserva", { hasText: nombre })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Finalizadas/ })).toHaveText(`Finalizadas (${finalizadas + 1})`);

    await page.getByRole("button", { name: /^Finalizadas/ }).click();
    const hecha = page.locator(".tarjeta-reserva", { hasText: nombre }).first();
    await expect(hecha.getByText("Finalizada", { exact: true })).toBeVisible();
    await expect(hecha.locator(".tarjeta-marca")).toContainText(/✓ Lista a las \d{2}:\d{2}/);
    // Terminada: ya no se ofrece cancelarla.
    await expect(hecha.getByRole("button", { name: /cancelar cita/i })).toHaveCount(0);

    // Deshacer la devuelve a Confirmadas.
    await hecha.getByRole("button", { name: /deshacer/i }).click();
    await expect(page.locator(".tarjeta-reserva", { hasText: nombre })).toHaveCount(0);
    await expect(subtitulo).toHaveText(new RegExp(`^Hoy: ${porTerminar} por terminar`));
    await page.getByRole("button", { name: /^Confirmadas/ }).click();
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator(".tarjeta-marca")).toHaveCount(0);

    // Limpieza.
    await tarjeta.getByRole("button", { name: /cancelar cita/i }).click();
    await page.getByRole("button", { name: /sí, cancelar la cita/i }).click();
    await expect(page.getByText(/cita cancelada/i)).toBeVisible();
  });
});

/** Hoy en la zona del equipo que ejecuta la prueba (la misma que el navegador), "YYYY-MM-DD". */
function hoyLocal(): string {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}
