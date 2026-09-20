import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lee .env.local sin dependencias: el fichero no se commitea y solo se usa en pruebas locales.
function leerEnvLocal(): Record<string, string> {
  try {
    const texto = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(
      texto
        .split(/\r?\n/)
        .filter((linea) => linea.includes("=") && !linea.trim().startsWith("#"))
        .map((linea) => {
          const i = linea.indexOf("=");
          return [linea.slice(0, i).trim(), linea.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...leerEnvLocal(), ...process.env };

/** Taller de pruebas `e2e` (id 3). Sus datos se pueden crear y borrar (CLAUDE.md). */
export const TALLER_E2E = {
  id: 3,
  slug: "e2e",
  nombre: "Taller de pruebas e2e",
  email: env.E2E_TALLER_EMAIL ?? "",
  password: env.E2E_TALLER_PASSWORD ?? "",
};

export function requiereCredenciales(): void {
  if (!TALLER_E2E.email || !TALLER_E2E.password) {
    throw new Error("Faltan E2E_TALLER_EMAIL / E2E_TALLER_PASSWORD en .env.local (ver .env.example).");
  }
}
