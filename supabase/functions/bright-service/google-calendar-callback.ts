import { createClient } from "jsr:@supabase/supabase-js@2";

const REDIRECT_URI =
  "https://zrrqqqbgwwovmglhqxwn.supabase.co/functions/v1/bright-service";

const APP_URL =
  Deno.env.get("CITALLER_APP_URL") ||
  "http://localhost:5173";

function redirigir(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // Google devuelve estos parámetros
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorGoogle = url.searchParams.get("error");

    if (errorGoogle) {
      return redirigir(
        `${APP_URL}/?calendar=error&motivo=${encodeURIComponent(
          errorGoogle
        )}`
      );
    }

    if (!code || !state) {
      return new Response(
        "Faltan parámetros de autorización de Google.",
        { status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ========================================
    // COMPROBAR EL STATE
    // ========================================

    const { data: oauthState, error: stateError } =
      await supabase
        .from("google_oauth_states")
        .select("state, taller_id, expires_at")
        .eq("state", state)
        .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      new Date(oauthState.expires_at) < new Date()
    ) {
      return new Response(
        "La autorización ha caducado o no es válida.",
        { status: 400 }
      );
    }

    const tallerId = oauthState.taller_id;

    // El state se usa una sola vez.
    await supabase
      .from("google_oauth_states")
      .delete()
      .eq("state", state);

    // ========================================
    // CAMBIAR CODE POR TOKENS
    // ========================================

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret =
      Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        "Faltan las credenciales de Google.",
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Error intercambiando código Google:",
        tokens
      );

      return new Response(
        "Google no pudo completar la conexión.",
        { status: 502 }
      );
    }

    // ========================================
    // REFRESH TOKEN
    // ========================================

    let refreshToken = tokens.refresh_token;

    // Google no siempre devuelve uno nuevo si
    // esa cuenta ya había autorizado la aplicación.
    if (!refreshToken) {
      const { data: conexionAnterior } =
        await supabase
          .from("integraciones_calendario")
          .select("refresh_token")
          .eq("taller_id", tallerId)
          .eq("proveedor", "google")
          .maybeSingle();

      refreshToken =
        conexionAnterior?.refresh_token || null;
    }

    if (!refreshToken) {
      return new Response(
        "Google no ha devuelto un refresh token. Vuelve a conectar el calendario.",
        { status: 400 }
      );
    }

    // ========================================
    // GUARDAR CONEXIÓN DEL TALLER
    // ========================================

    const { error: guardarError } =
      await supabase
        .from("integraciones_calendario")
        .upsert(
          {
            taller_id: tallerId,
            proveedor: "google",
            calendar_id: "primary",
            refresh_token: refreshToken,
            scope:
              tokens.scope ||
              "https://www.googleapis.com/auth/calendar.events",
            conectado: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "taller_id,proveedor",
          }
        );

    if (guardarError) {
      console.error(
        "Error guardando Google Calendar:",
        guardarError
      );

      return new Response(
        "No se pudo guardar la conexión del calendario.",
        { status: 500 }
      );
    }

    // ========================================
    // VOLVER A CITALLER
    // ========================================

    return redirigir(
      `${APP_URL}/?taller=${tallerId}&modo=taller&calendar=connected`
    );
  } catch (error) {
    console.error("Google callback:", error);

    return new Response(
      "Error interno conectando Google Calendar.",
      { status: 500 }
    );
  }
});