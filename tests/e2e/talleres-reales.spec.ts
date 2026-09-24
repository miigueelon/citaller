import { expect, test } from "@playwright/test";

// Los dos talleres reales, en solo lectura: nunca se envía una reserva ni se entra en su panel.
// Comprueba que su página de reserva carga con la configuración de la base de datos (servicios,
// campo extra, calendario y horas) y que su panel pide login. Vale contra cualquier entorno: la BD es
// la misma.
const TALLERES = [
  { slug: "speedbikes", nombre: "Speed Bikes", conKilometros: true },
  { slug: "rikandroll", nombre: "Rik and Roll", conKilometros: false },
];

for (const taller of TALLERES) {
  test(`${taller.nombre}: la página de reserva carga con sus servicios y llega al calendario`, async ({ page }) => {
    await page.goto(`/${taller.slug}`);
    await expect(page.getByText(taller.nombre).first()).toBeVisible();

    // Servicios del taller en el desplegable (más la opción vacía).
    const opciones = page.locator("#servicio option");
    expect(await opciones.count()).toBeGreaterThan(5);
    // Campo extra "Kilómetros": Speedbikes sí, Rik and Roll no.
    await expect(page.locator("#campo-kilometros")).toHaveCount(taller.conKilometros ? 1 : 0);

    // Hasta el calendario, sin enviar nada.
    await page.locator('input[name="matricula"]').fill("0000AAA");
    await page.locator('input[name="vehiculo"]').fill("Prueba");
    await page.locator('input[name="nombre"]').fill("Prueba");
    await page.locator('input[name="telefono"]').fill("600000000");
    await page.locator("#servicio").selectOption({ index: 1 });
    const continuar = page.getByRole("button", { name: /continuar/i });
    await expect(continuar).toBeEnabled();
    await continuar.click();

    await expect(page.getByRole("heading", { name: /elige fecha y hora/i })).toBeVisible();
    const diasHabilitados = page.locator(".react-calendar__month-view__days button:not([disabled])");
    await expect(diasHabilitados.first()).toBeVisible();
    await diasHabilitados.first().click();
    await expect(page.getByRole("heading", { name: /horas disponibles/i })).toBeVisible();
    // O hay horas, o el día está completo: nunca un error.
    await expect(page.locator(".horas-grid button").first().or(page.getByText(/no hay horas disponibles/i))).toBeVisible();
  });

  if (taller.slug === "rikandroll") {
    test("Rik and Roll: Neumáticos ofrece solo 2 o 4 y exige las medidas con la imagen de ayuda", async ({ page }) => {
      await page.goto(`/${taller.slug}`);
      await page.locator("#servicio").selectOption("Neumáticos");

      // Cantidad: solo 2 o 4 (pedido del taller, 24-sep-2026), además de la opción vacía.
      const cantidad = page.locator("#campo-cantidad_neumaticos");
      await expect(cantidad).toHaveAttribute("required", "");
      await expect(cantidad.locator("option:not([disabled])")).toHaveText(["2", "4"]);

      // Medidas: descripción obligatoria del servicio, con su ayuda y la foto del lateral del neumático.
      const medidas = page.locator("#descripcion");
      await expect(medidas).toHaveAttribute("required", "");
      await expect(page.getByText(/medida que aparece en el lateral/i)).toBeVisible();
      const imagen = page.getByRole("img", { name: /ayuda para neumáticos/i });
      await expect(imagen).toBeVisible();
      // Que cargue de verdad (no solo que esté en la página): contra un preview remoto tarda más que en local.
      await expect.poll(() => imagen.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 15_000 }).toBe(true);

      // Sin cantidad ni medidas no se puede continuar; con 2 y una medida, sí (no se envía nada).
      await page.locator('input[name="matricula"]').fill("0000AAA");
      await page.locator('input[name="vehiculo"]').fill("Prueba");
      await page.locator('input[name="nombre"]').fill("Prueba");
      await page.locator('input[name="telefono"]').fill("600000000");
      const continuar = page.getByRole("button", { name: /continuar/i });
      await expect(continuar).toBeDisabled();
      await cantidad.selectOption("2");
      await expect(continuar).toBeDisabled();
      await medidas.fill("205/55 R16");
      await expect(continuar).toBeEnabled();
    });
  }

  test(`${taller.nombre}: su panel pide login`, async ({ page }) => {
    await page.goto(`/${taller.slug}/panel`);
    await expect(page.getByPlaceholder(/email|correo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar|iniciar|acceder/i })).toBeVisible();
  });
}
