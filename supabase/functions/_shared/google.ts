// Cliente mínimo de Google OAuth 2.0 y Google Calendar API para CiTaller.

export const GOOGLE_SCOPE_CALENDAR = "https://www.googleapis.com/auth/calendar.events";

// Las horas de las reservas se guardan en hora local del taller (docs/arquitectura.md).
// Hoy todos los talleres están en España; la columna talleres.zona_horaria es roadmap.
export const ZONA_HORARIA_TALLER = "Europe/Madrid";

export class ErrorGoogle extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
    readonly detalle?: unknown,
  ) {
    super(mensaje);
  }

  /** El refresh token ya no vale (revocado, o caducado a los 7 días con la app en "Testing"). */
  get conexionCaducada(): boolean {
    const detalle = this.detalle as { error?: string } | undefined;
    return detalle?.error === "invalid_grant";
  }
}

function credenciales(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new ErrorGoogle("Faltan los secretos GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET", 500);
  }
  return { clientId, clientSecret };
}

/**
 * Redirect URI del callback. Tiene que coincidir EXACTAMENTE con una de las "URIs de
 * redirección autorizados" del cliente OAuth en Google Cloud (docs/integraciones.md).
 */
export function redirectUriCallback(): string {
  const explicita = Deno.env.get("GOOGLE_REDIRECT_URI");
  if (explicita) return explicita;
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;
}

export function urlAutorizacion(state: string): string {
  const { clientId } = credenciales();
  const parametros = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriCallback(),
    response_type: "code",
    scope: GOOGLE_SCOPE_CALENDAR,
    access_type: "offline", // para recibir refresh token
    prompt: "consent", // fuerza un refresh token nuevo aunque la cuenta ya hubiera autorizado
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parametros}`;
}

async function pedirToken(parametros: Record<string, string>): Promise<Record<string, unknown>> {
  const { clientId, clientSecret } = credenciales();
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...parametros }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorGoogle("Google rechazó la petición de token", respuesta.status, datos);
  }
  return datos as Record<string, unknown>;
}

export async function cambiarCodigoPorTokens(
  code: string,
): Promise<{ refreshToken: string | null; scope: string | null }> {
  const datos = await pedirToken({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUriCallback(),
  });
  return {
    refreshToken: typeof datos.refresh_token === "string" ? datos.refresh_token : null,
    scope: typeof datos.scope === "string" ? datos.scope : null,
  };
}

export async function accessTokenDesdeRefresh(refreshToken: string): Promise<string> {
  const datos = await pedirToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
  if (typeof datos.access_token !== "string") {
    throw new ErrorGoogle("Google no devolvió access_token", 502, datos);
  }
  return datos.access_token;
}

/** "YYYY-MM-DD" + "HH:MM[:SS]" + minutos → "YYYY-MM-DDTHH:MM:SS" (hora local, sin zona). */
export function sumarMinutosLocal(dia: string, hora: string, minutos: number): string {
  const [anio, mes, diaMes] = dia.split("-").map(Number);
  const [horas, mins] = hora.substring(0, 5).split(":").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, diaMes, horas, mins));
  fecha.setUTCMinutes(fecha.getUTCMinutes() + minutos);
  return fecha.toISOString().slice(0, 19);
}

export interface EventoCalendario {
  resumen: string;
  descripcion: string;
  /** Hora local del taller, "YYYY-MM-DDTHH:MM:SS". */
  inicioLocal: string;
  finLocal: string;
}

function urlEventos(calendarId: string): string {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
}

export async function crearEvento(
  accessToken: string,
  calendarId: string,
  evento: EventoCalendario,
): Promise<{ id: string; htmlLink: string | null }> {
  const respuesta = await fetch(urlEventos(calendarId), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: evento.resumen,
      description: evento.descripcion,
      start: { dateTime: evento.inicioLocal, timeZone: ZONA_HORARIA_TALLER },
      end: { dateTime: evento.finLocal, timeZone: ZONA_HORARIA_TALLER },
      reminders: { useDefault: true },
    }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || typeof datos.id !== "string") {
    throw new ErrorGoogle("Google Calendar rechazó la creación del evento", respuesta.status, datos);
  }
  return { id: datos.id, htmlLink: typeof datos.htmlLink === "string" ? datos.htmlLink : null };
}

/** Borra el evento. Si ya no existe (404/410) se considera borrado. */
export async function borrarEvento(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const respuesta = await fetch(`${urlEventos(calendarId)}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (respuesta.ok || respuesta.status === 404 || respuesta.status === 410) return;
  const detalle = await respuesta.text().catch(() => "");
  throw new ErrorGoogle("Google Calendar no pudo eliminar el evento", respuesta.status, detalle);
}

// ---- Días de cierre (eventos de día completo marcados como de CiTaller) ----

/** Propiedad privada que marca los eventos de cierre creados por CiTaller. */
export const PROPIEDAD_CIERRE = { clave: "citaller", valor: "cierre" } as const;

/** Eventos de cierre de CiTaller que tocan el rango [desde, hasta) ("YYYY-MM-DD"), con su clave. */
export async function listarEventosCierre(
  accessToken: string,
  calendarId: string,
  desde: string,
  hasta: string,
): Promise<Array<{ id: string; clave: string | null }>> {
  const eventos: Array<{ id: string; clave: string | null }> = [];
  let pagina: string | undefined;
  do {
    const params = new URLSearchParams({
      privateExtendedProperty: `${PROPIEDAD_CIERRE.clave}=${PROPIEDAD_CIERRE.valor}`,
      timeMin: `${desde}T00:00:00Z`,
      timeMax: `${hasta}T00:00:00Z`,
      singleEvents: "true",
      showDeleted: "false",
      maxResults: "250",
      fields: "items(id,extendedProperties),nextPageToken",
    });
    if (pagina) params.set("pageToken", pagina);
    const respuesta = await fetch(`${urlEventos(calendarId)}?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new ErrorGoogle("Google Calendar no dejó leer los días de cierre", respuesta.status, datos);
    for (const item of (datos.items ?? []) as Array<{ id: string; extendedProperties?: { private?: Record<string, string> } }>) {
      eventos.push({ id: item.id, clave: item.extendedProperties?.private?.citaller_clave ?? null });
    }
    pagina = typeof datos.nextPageToken === "string" ? datos.nextPageToken : undefined;
  } while (pagina);
  return eventos;
}

export interface EventoCierre {
  resumen: string;
  descripcion: string;
  /** "YYYY-MM-DD" */
  inicio: string;
  /** "YYYY-MM-DD", exclusivo. */
  finExclusivo: string;
  clave: string;
}

/** Evento de día completo, ocupado y sin avisos, marcado como cierre de CiTaller. */
export async function crearEventoCierre(accessToken: string, calendarId: string, evento: EventoCierre): Promise<string> {
  const respuesta = await fetch(urlEventos(calendarId), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: evento.resumen,
      description: evento.descripcion,
      start: { date: evento.inicio },
      end: { date: evento.finExclusivo },
      transparency: "opaque",
      reminders: { useDefault: false, overrides: [] },
      extendedProperties: { private: { [PROPIEDAD_CIERRE.clave]: PROPIEDAD_CIERRE.valor, citaller_clave: evento.clave } },
    }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || typeof datos.id !== "string") {
    throw new ErrorGoogle("Google Calendar rechazó el día de cierre", respuesta.status, datos);
  }
  return datos.id;
}
