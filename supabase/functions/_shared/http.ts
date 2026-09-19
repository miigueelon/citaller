// Utilidades HTTP comunes a las Edge Functions de CiTaller.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function responderJson(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Respuesta al preflight CORS del navegador, o null si la petición no es OPTIONS. */
export function respuestaPreflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response("ok", { status: 200, headers: corsHeaders }) : null;
}

export function redirigir(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

/** Lee el cuerpo JSON; si no es un objeto válido devuelve {}. */
export async function leerCuerpoJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo = await req.json();
    return cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Convierte un id recibido en el cuerpo a entero positivo, o null. */
export function idPositivo(valor: unknown): number | null {
  const numero = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  return typeof numero === "number" && Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
