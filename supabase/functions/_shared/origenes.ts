// A qué URLs de la app puede volver el flujo OAuth de Google. El frontend manda `volver_a`
// al iniciar la conexión; solo se acepta si su origen está en esta lista, para que nadie pueda
// usar el callback como redirección abierta.

// Previews de Vercel del proyecto `citaller` de la cuenta `miigueelon`.
const PREVIEWS_VERCEL = [
  /^https:\/\/citaller-[a-z0-9]{9}-miigueelon\.vercel\.app$/,
  /^https:\/\/citaller-git-[a-z0-9-]+-miigueelon\.vercel\.app$/,
];

/** URL base de la app en producción (secreto CITALLER_APP_URL), sin barra final. */
export function urlApp(): string {
  return (Deno.env.get("CITALLER_APP_URL") || "https://citaller.es").replace(/\/+$/, "");
}

export function origenPermitido(origen: string): boolean {
  const extra = (Deno.env.get("CITALLER_ORIGENES_EXTRA") ?? "")
    .split(",")
    .map((valor) => valor.trim())
    .filter(Boolean);
  const exactos = new Set([new URL(urlApp()).origin, "http://localhost:5173", ...extra]);
  return exactos.has(origen) || PREVIEWS_VERCEL.some((patron) => patron.test(origen));
}

/** `volverA` si es una URL http(s) de un origen permitido; si no, el panel del taller en producción. */
export function urlDeVuelta(volverA: unknown, tallerId: number): string {
  if (typeof volverA === "string") {
    try {
      const url = new URL(volverA);
      if ((url.protocol === "https:" || url.protocol === "http:") && origenPermitido(url.origin)) {
        return url.toString();
      }
    } catch {
      // URL mal formada: se usa la de por defecto.
    }
  }
  return `${urlApp()}/?taller=${tallerId}&modo=taller`;
}

export function conParametros(url: string, parametros: Record<string, string>): string {
  const resultado = new URL(url);
  for (const [clave, valor] of Object.entries(parametros)) resultado.searchParams.set(clave, valor);
  return resultado.toString();
}
