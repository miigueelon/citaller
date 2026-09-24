import { expect, test } from "@playwright/test";

// Páginas del sitio: la principal (`/`) y la política de privacidad (`/privacidad`). Son las que
// Google revisa para publicar la app de Calendar, así que tienen que abrir sin taller y enlazarse.

test("la raíz muestra la página principal con el enlace a privacidad", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/reservas de cita online/i);
  await expect(page.getByRole("link", { name: /escríbenos/i })).toHaveAttribute("href", /^mailto:/);
  await page.getByRole("link", { name: /política de privacidad/i }).click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/política de privacidad/i);
});

test("la política de privacidad explica Google Calendar y cómo pedir el borrado", async ({ page }) => {
  await page.goto("/privacidad");
  // El taller decide sobre los datos de quien reserva; CiTaller tiene titular con nombre.
  await expect(page.getByRole("heading", { name: /quién es quién/i })).toBeVisible();
  await expect(page.getByText(/Miguel Ángel Rodríguez Sevilla/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /google calendar/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /política de datos de usuario/i })).toHaveAttribute(
    "href",
    "https://developers.google.com/terms/api-services-user-data-policy",
  );
  await expect(page.getByRole("heading", { name: /tus derechos/i })).toBeVisible();
  await page.getByRole("link", { name: /página principal/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("las URLs antiguas con ?taller= siguen redirigiendo", async ({ page }) => {
  await page.goto("/?taller=3");
  await expect(page).toHaveURL(/\/e2e$/);
});
