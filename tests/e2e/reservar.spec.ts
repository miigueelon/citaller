import { expect, test } from "@playwright/test";
import { SUPABASE, TALLER_E2E, telefonoAleatorio } from "./entorno";

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
    await page.locator('input[name="telefono"]').fill("600111222");
    await page.locator("#servicio").selectOption("Revisión / mantenimiento");

    // "Nombre y apellido": con una sola palabra avisa y no deja continuar (24-sep-2026).
    const continuar = page.getByRole("button", { name: /continuar/i });
    await page.locator('input[name="nombre"]').fill("Cliente");
    await expect(page.getByText(/escribe tu nombre y primer apellido/i)).toBeVisible();
    await expect(continuar).toBeDisabled();
    await page.locator('input[name="nombre"]').fill("Cliente de prueba");
    await expect(page.getByText(/escribe tu nombre y primer apellido/i)).toHaveCount(0);
    await expect(continuar).toBeEnabled();
    await continuar.click();

    await expect(page.getByRole("heading", { name: /elige fecha y hora/i })).toBeVisible();
    // Al menos un día laborable de las próximas semanas tiene que poder pulsarse.
    const diasHabilitados = page.locator(".react-calendar__month-view__days button:not([disabled])");
    await expect(diasHabilitados.first()).toBeVisible();
    await diasHabilitados.first().click();
    await expect(page.getByRole("heading", { name: /horas disponibles/i })).toBeVisible();
  });

  test("antes de enviar, el resumen dice para qué son los datos y enlaza a privacidad", async ({ page }) => {
    await page.goto(URL_RESERVA);
    await page.locator('input[name="nombre"]').fill("Cliente de prueba");
    await page.locator('input[name="matricula"]').fill("E2E1234");
    await page.locator('input[name="vehiculo"]').fill("Coche de prueba");
    await page.locator('input[name="telefono"]').fill("600111222");
    await page.locator("#servicio").selectOption("Revisión / mantenimiento");
    await page.getByRole("button", { name: /continuar/i }).click();

    // El primer día con horas libres (un día puede estar lleno).
    const dias = page.locator(".react-calendar__month-view__days button:not([disabled])");
    const hora = page.locator(".horas-grid button.hora").first();
    for (let i = 0; i < 10; i++) {
      await dias.nth(i).click();
      await expect(page.getByText(/comprobando disponibilidad/i)).toHaveCount(0);
      if (await hora.isVisible()) break;
    }
    await hora.click();
    await page.getByRole("button", { name: /continuar/i }).click();

    // Primera capa del RGPD encima del botón; no se envía nada.
    const aviso = page.locator(".aviso-datos");
    await expect(aviso).toContainText("Solo usamos tus datos para gestionar tu cita");
    await expect(aviso.getByRole("link", { name: /privacidad/i })).toHaveAttribute("href", "/privacidad");
    await expect(page.getByRole("button", { name: /enviar solicitud/i })).toBeEnabled();
  });
});

test.describe("Antelación por servicio", () => {
  // En el taller e2e, "Neumáticos" necesita un bloque de apertura entero (como en Rik and Roll). La
  // primera hora posible la dice la base de datos; la prueba se la pide por la misma RPC que usa la
  // web y comprueba que la pantalla la anuncia y no ofrece horas anteriores.
  test("Neumáticos anuncia la primera hora posible y no ofrece horas anteriores", async ({ page, request }) => {
    const cabeceras = { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` };
    const servicios = await request.get(`${SUPABASE.url}/rest/v1/servicios_taller?taller_id=eq.${TALLER_E2E.id}&nombre=eq.${encodeURIComponent("Neumáticos")}&select=id`, { headers: cabeceras });
    const servicioId = ((await servicios.json()) as Array<{ id: number }>)[0]?.id;
    expect(servicioId).toBeTruthy();
    const rpc = await request.post(`${SUPABASE.url}/rest/v1/rpc/antelacion_minima`, { headers: cabeceras, data: { p_taller_id: TALLER_E2E.id, p_servicio_id: servicioId } });
    const minimo = (await rpc.json()) as string | null; // "2026-09-24T16:00:00", hora del taller
    expect(minimo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    const [diaMinimo, horaMinima] = [String(minimo).slice(0, 10), String(minimo).slice(11, 16)];

    await page.goto(URL_RESERVA);
    await expect(page.getByText(TALLER_E2E.nombre)).toBeVisible();
    await page.locator('input[name="matricula"]').fill("E2E1234");
    await page.locator('input[name="vehiculo"]').fill("Coche de prueba");
    await page.locator('input[name="nombre"]').fill("Cliente neumáticos");
    await page.locator('input[name="telefono"]').fill(telefonoAleatorio());
    await page.locator("#servicio").selectOption("Neumáticos");
    await page.locator('select[name="cantidad_neumaticos"]').selectOption("2");
    await page.locator("#descripcion").fill("205/55 R16");
    await page.getByRole("button", { name: /continuar/i }).click();

    await expect(page.getByRole("heading", { name: /elige fecha y hora/i })).toBeVisible();
    const aviso = page.getByRole("status");
    await expect(aviso).toContainText(/primera hora disponible/i);
    await expect(aviso).toContainText(horaMinima);

    // El día de la primera hora posible puede caer en el mes siguiente.
    const mesHoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).format(new Date());
    if (diaMinimo.slice(0, 7) !== mesHoy) await page.locator(".react-calendar__navigation__next-button").click();
    const diaDelMes = String(Number(diaMinimo.slice(8, 10)));
    const casilla = page.locator(".react-calendar__month-view__days button:not([disabled])", { hasText: new RegExp(`^${diaDelMes}$`) });
    await expect(casilla).toBeVisible();
    await casilla.click();

    await expect(page.getByRole("heading", { name: /horas disponibles/i })).toBeVisible();
    await expect(page.locator(".horas-grid .hora").first()).toBeVisible();
    const horas = await page.locator(".horas-grid .hora").allTextContents();
    // Ninguna hora ofrecida ese día es anterior a la primera posible ("HH:MM" se compara como texto).
    expect(horas.every((hora) => hora >= horaMinima)).toBe(true);
    // Y la primera posible se ofrece, salvo que ya esté llena (2 por hora en e2e).
    const ocupacion = await request.post(`${SUPABASE.url}/rest/v1/rpc/ocupacion_dia`, { headers: cabeceras, data: { p_taller_id: TALLER_E2E.id, p_dia: diaMinimo } });
    const enLaMinima = ((await ocupacion.json()) as Array<{ hora: string; total: number }>).find((fila) => fila.hora.startsWith(horaMinima))?.total ?? 0;
    if (enLaMinima < 2) expect(horas[0]).toBe(horaMinima);
  });
});
