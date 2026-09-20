import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Garantía mecánica de "no mezclar clientes": el seed de un taller no puede mencionar el slug de
// otro, y cada carpeta de cliente tiene su seed idempotente y sin secretos.
const carpeta = join(process.cwd(), "clientes");
const slugs = readdirSync(carpeta, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

describe("seeds de clientes", () => {
  it("hay al menos un taller y la plantilla", () => {
    expect(slugs.length).toBeGreaterThan(0);
    expect(existsSync(join(carpeta, "_plantilla", "seed.sql"))).toBe(true);
  });

  for (const slug of slugs) {
    describe(slug, () => {
      const ruta = join(carpeta, slug, "seed.sql");
      const sql = existsSync(ruta) ? readFileSync(ruta, "utf8") : "";

      it("tiene seed.sql y usa su propio slug", () => {
        expect(sql.length).toBeGreaterThan(0);
        expect(sql).toMatch(new RegExp(`slug = '${slug}'`));
      });

      it("no menciona a otros talleres", () => {
        for (const otro of slugs.filter((s) => s !== slug)) {
          expect(sql).not.toMatch(new RegExp(`'${otro}'`));
        }
      });

      it("no contiene secretos", () => {
        expect(sql).not.toMatch(/refresh_token\s*=|whatsapp_phone_number_id\s*=|EAA[A-Za-z0-9]{20,}|sb_secret|service_role/i);
      });

      it("es idempotente en sus inserts", () => {
        const inserts = sql.match(/insert into[\s\S]*?;/gi) ?? [];
        for (const insert of inserts) {
          expect(insert).toMatch(/on conflict|where not exists/i);
        }
      });
    });
  }
});
