import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { request } from "@playwright/test";
import { MATRICULAS_DE_PRUEBA, SUPABASE, TALLER_E2E } from "./entorno";

// Preparación común antes de los tests: acceso al preview protegido y limpieza de restos.

// Los previews de Vercel están protegidos. El secreto "Protection Bypass for Automation" se puede
// mandar de dos formas: en la cabecera `x-vercel-protection-bypass` de cada petición, o una sola vez
// para que Vercel devuelva una cookie de acceso.
//
// Aquí se usa la cookie a propósito. La cabecera se aplicaría a *todas* las peticiones del
// navegador, también a las de Supabase, y entonces el navegador pide permiso para esa cabecera en el
// preflight CORS: PostgREST lo concede (refleja las cabeceras pedidas), pero las Edge Functions
// devuelven una lista fija, así que el navegador bloqueaba las llamadas a confirmar-reserva,
// crear-reserva-taller y cancelar-cita-cliente. Con la cookie, las peticiones salen limpias.

/** Fichero con la cookie de acceso al preview (no se commitea: contiene un token). */
export const ESTADO_BYPASS = "tests/e2e/.auth/vercel.json";

async function cookieDelPreview(base: string, secreto: string): Promise<void> {
  const contexto = await request.newContext({ baseURL: base });
  const respuesta = await contexto.get("/", {
    headers: { "x-vercel-protection-bypass": secreto, "x-vercel-set-bypass-cookie": "true" },
  });
  if (!respuesta.ok()) {
    throw new Error(`El preview ${base} respondió ${respuesta.status()}: comprueba E2E_BYPASS_SECRET.`);
  }
  mkdirSync(dirname(ESTADO_BYPASS), { recursive: true });
  const estado = await contexto.storageState({ path: ESTADO_BYPASS });
  await contexto.dispose();
  if (!estado.cookies.some((cookie) => cookie.name.startsWith("_vercel_jwt"))) {
    throw new Error(`El preview ${base} no devolvió la cookie de bypass (_vercel_jwt).`);
  }
}

/**
 * Cancela las citas de prueba que sigan activas en el taller e2e. Si una ejecución anterior se cortó
 * antes de limpiar, sus citas seguirían ocupando huecos y la siguiente fallaría con CT001
 * (la capacidad del taller de pruebas es de 2 por hora).
 */
async function cancelarRestos(): Promise<void> {
  if (!SUPABASE.url || !SUPABASE.anonKey || !TALLER_E2E.email) return;
  const contexto = await request.newContext({
    baseURL: SUPABASE.url,
    extraHTTPHeaders: { apikey: SUPABASE.anonKey, "Content-Type": "application/json" },
  });
  try {
    const sesion = await contexto.post("/auth/v1/token?grant_type=password", {
      data: { email: TALLER_E2E.email, password: TALLER_E2E.password },
    });
    if (!sesion.ok()) return; // sin sesión no se puede limpiar; los tests ya avisarán
    const { access_token: token } = (await sesion.json()) as { access_token?: string };
    if (!token) return;

    const filtro = `taller_id=eq.${TALLER_E2E.id}&estado=in.(Pendiente,Confirmada)&matricula=in.(${MATRICULAS_DE_PRUEBA.join(",")})`;
    const respuesta = await contexto.patch(`/rest/v1/reservas?${filtro}`, {
      headers: { Authorization: `Bearer ${token}`, Prefer: "return=representation" },
      data: { estado: "Cancelada" },
    });
    if (respuesta.ok()) {
      const canceladas = (await respuesta.json()) as unknown[];
      if (canceladas.length > 0) console.log(`(limpieza previa: ${canceladas.length} citas de prueba canceladas)`);
    }
  } finally {
    await contexto.dispose();
  }
}

export default async function preparar(): Promise<void> {
  const base = process.env.E2E_BASE_URL;
  const secreto = process.env.E2E_BYPASS_SECRET;
  if (base && secreto) await cookieDelPreview(base, secreto);
  await cancelarRestos();
}
