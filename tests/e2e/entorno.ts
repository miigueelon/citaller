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

export const SUPABASE = {
  url: env.VITE_SUPABASE_URL ?? "",
  anonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
};

export function requiereCredenciales(): void {
  if (!TALLER_E2E.email || !TALLER_E2E.password) {
    throw new Error("Faltan E2E_TALLER_EMAIL / E2E_TALLER_PASSWORD en .env.local (ver .env.example).");
  }
}

/** Teléfono móvil español aleatorio: evita los límites por teléfono (3 activas, 5 al día). */
export function telefonoAleatorio(): string {
  return `6${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

/** Próximo día laborable a partir de pasado mañana, "YYYY-MM-DD" (en la zona del taller). */
export function proximoDiaLaborable(desdeDias = 2): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + desdeDias);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) fecha.setDate(fecha.getDate() + 1);
  // 25-dic es festivo del taller e2e.
  if (fecha.getMonth() === 11 && fecha.getDate() === 25) fecha.setDate(26);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) fecha.setDate(fecha.getDate() + 1);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Crea una reserva pendiente en el taller e2e con la RPC pública (como haría la web). */
export async function crearReservaDePrueba(datos: { nombre?: string; hora?: string; dia?: string } = {}): Promise<{ id: number; token: string; telefono: string; dia: string; hora: string }> {
  if (!SUPABASE.url || !SUPABASE.anonKey) throw new Error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local.");
  const telefono = telefonoAleatorio();
  const dia = datos.dia ?? proximoDiaLaborable();
  const hora = datos.hora ?? "11:00";
  const respuesta = await fetch(`${SUPABASE.url}/rest/v1/rpc/crear_reserva_publica`, {
    method: "POST",
    headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_taller_id: TALLER_E2E.id,
      p_matricula: "E2E1234",
      p_nombre: datos.nombre ?? "Cliente Playwright",
      p_telefono: telefono,
      p_vehiculo: "Coche de prueba",
      p_servicio: "Revisión / mantenimiento",
      p_descripcion: "",
      p_dia: dia,
      p_hora: hora,
      p_datos_extra: { kilometros: "1000" },
    }),
  });
  const cuerpo = (await respuesta.json()) as Array<{ reserva_id: number; token_publico: string }> | { message?: string };
  if (!respuesta.ok || !Array.isArray(cuerpo) || !cuerpo[0]) {
    throw new Error(`No se pudo crear la reserva de prueba (HTTP ${respuesta.status}): ${JSON.stringify(cuerpo)}`);
  }
  return { id: cuerpo[0].reserva_id, token: cuerpo[0].token_publico, telefono: `34${telefono}`, dia, hora };
}
