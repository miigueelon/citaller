// deno test --allow-env supabase/functions/_shared/
import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { agruparCierres, claveBloque, hoyEnMadrid, planSincronizacion, resumenCierre, sumarDias } from "./cierres.ts";
import { crearEventoCierre, listarEventosCierre } from "./google.ts";

Deno.test("sumarDias cruza meses, años y bisiestos", () => {
  assertEquals(sumarDias("2026-12-31", 1), "2027-01-01");
  assertEquals(sumarDias("2028-02-28", 1), "2028-02-29");
  assertEquals(sumarDias("2026-03-01", -1), "2026-02-28");
});

Deno.test("hoyEnMadrid: a las 23:30 UTC de verano en Madrid ya es el día siguiente", () => {
  assertEquals(hoyEnMadrid(new Date("2026-07-14T23:30:00Z")), "2026-07-15");
  assertEquals(hoyEnMadrid(new Date("2026-12-31T22:59:00Z")), "2026-12-31");
  assertEquals(hoyEnMadrid(new Date("2026-12-31T23:00:00Z")), "2027-01-01");
});

Deno.test("un festivo suelto es un bloque de un día (final exclusivo)", () => {
  const [bloque] = agruparCierres([{ fecha: "2026-12-25", nombre: "Navidad" }]);
  assertEquals([bloque.inicio, bloque.finExclusivo, bloque.nombre], ["2026-12-25", "2026-12-26", "Navidad"]);
});

Deno.test("días seguidos con el mismo nombre forman un solo bloque; con otro nombre, no", () => {
  const vacaciones = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"].map((fecha) => ({ fecha, nombre: "Vacaciones" }));
  const bloques = agruparCierres([
    { fecha: "2026-12-26", nombre: "Sant Esteve" },
    ...vacaciones.reverse(), // en cualquier orden
    { fecha: "2026-12-25", nombre: "Navidad" },
    { fecha: "2026-08-15", nombre: "Asunción" },
  ]);
  assertEquals(
    bloques.map((b) => `${b.nombre} ${b.inicio}→${b.finExclusivo}`),
    ["Vacaciones 2026-08-03→2026-08-08", "Asunción 2026-08-15→2026-08-16", "Navidad 2026-12-25→2026-12-26", "Sant Esteve 2026-12-26→2026-12-27"],
  );
});

Deno.test("fechas repetidas no duplican bloques", () => {
  assertEquals(agruparCierres([{ fecha: "2026-10-12", nombre: "Pilar" }, { fecha: "2026-10-12", nombre: "Pilar" }]).length, 1);
});

Deno.test("la clave cambia si cambian las fechas o el nombre", () => {
  const base = claveBloque("2026-12-25", "2026-12-26", "Navidad");
  assertEquals(claveBloque("2026-12-25", "2026-12-26", " Navidad "), base);
  assertNotEquals(claveBloque("2026-12-24", "2026-12-26", "Navidad"), base);
  assertNotEquals(claveBloque("2026-12-25", "2026-12-26", "Nadal"), base);
});

Deno.test("plan: crea lo que falta, borra lo que sobra y los duplicados, no toca lo que ya está", () => {
  const deseados = agruparCierres([
    { fecha: "2026-10-12", nombre: "Fiesta Nacional de España" },
    { fecha: "2026-12-25", nombre: "Navidad" },
  ]);
  const [pilar, navidad] = deseados;
  const plan = planSincronizacion(deseados, [
    { id: "a", clave: pilar.clave }, // ya está
    { id: "b", clave: pilar.clave }, // duplicado
    { id: "c", clave: claveBloque("2026-08-14", "2026-08-15", "Festivo local de Castelldefels") }, // ya no es festivo
    { id: "d", clave: null }, // marcado como de CiTaller pero sin clave
  ]);
  assertEquals(plan.crear.map((b) => b.clave), [navidad.clave]);
  assertEquals(plan.borrar, ["b", "c", "d"]);
});

Deno.test("plan: sin cambios no hace nada", () => {
  const deseados = agruparCierres([{ fecha: "2026-12-25", nombre: "Navidad" }]);
  assertEquals(planSincronizacion(deseados, [{ id: "x", clave: deseados[0].clave }]), { crear: [], borrar: [] });
});

// ---- Llamadas a Google con fetch falso ----

async function conFetchFalso(respuestas: Response[], prueba: (urls: string[], cuerpos: unknown[]) => Promise<void>) {
  const original = globalThis.fetch;
  const urls: string[] = [];
  const cuerpos: unknown[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    urls.push(String(url));
    cuerpos.push(init?.body ? JSON.parse(String(init.body)) : null);
    return Promise.resolve(respuestas.shift() ?? new Response("{}", { status: 500 }));
  }) as typeof fetch;
  try {
    await prueba(urls, cuerpos);
  } finally {
    globalThis.fetch = original;
  }
}

Deno.test("listarEventosCierre filtra por la propiedad de CiTaller y sigue las páginas", async () => {
  await conFetchFalso(
    [
      new Response(JSON.stringify({ items: [{ id: "e1", extendedProperties: { private: { citaller: "cierre", citaller_clave: "k1" } } }], nextPageToken: "p2" })),
      new Response(JSON.stringify({ items: [{ id: "e2" }] })),
    ],
    async (urls) => {
      const eventos = await listarEventosCierre("tok", "primary", "2026-09-26", "2027-10-31");
      assertEquals(eventos, [{ id: "e1", clave: "k1" }, { id: "e2", clave: null }]);
      const primera = new URL(urls[0]);
      assertEquals(primera.searchParams.get("privateExtendedProperty"), "citaller=cierre");
      assertEquals(primera.searchParams.get("timeMin"), "2026-09-26T00:00:00Z");
      assertEquals(new URL(urls[1]).searchParams.get("pageToken"), "p2");
    },
  );
});

Deno.test("crearEventoCierre: día completo, ocupado, sin avisos y marcado como de CiTaller", async () => {
  await conFetchFalso([new Response(JSON.stringify({ id: "nuevo" }))], async (_urls, cuerpos) => {
    const id = await crearEventoCierre("tok", "primary", {
      resumen: resumenCierre("Navidad"),
      descripcion: "x",
      inicio: "2026-12-25",
      finExclusivo: "2026-12-26",
      clave: "k",
    });
    assertEquals(id, "nuevo");
    assertEquals(cuerpos[0], {
      summary: "🔒 Taller cerrado · Navidad",
      description: "x",
      start: { date: "2026-12-25" },
      end: { date: "2026-12-26" },
      transparency: "opaque",
      reminders: { useDefault: false, overrides: [] },
      extendedProperties: { private: { citaller: "cierre", citaller_clave: "k" } },
    });
  });
});
