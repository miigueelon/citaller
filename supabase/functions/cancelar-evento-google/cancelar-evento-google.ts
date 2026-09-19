import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Usuario no autenticado",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Sesión no válida",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { reserva_id } = await req.json();

    if (!reserva_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Falta reserva_id",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: reserva, error: reservaError } =
      await supabase
        .from("reservas")
        .select(`
          id,
          taller_id,
          estado,
          google_event_id
        `)
        .eq("id", reserva_id)
        .single();

    if (reservaError || !reserva) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Reserva no encontrada",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: taller, error: tallerError } =
      await supabase
        .from("talleres")
        .select("id, user_id")
        .eq("id", reserva.taller_id)
        .single();

    if (
      tallerError ||
      !taller ||
      taller.user_id !== user.id
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No tienes permiso para esta reserva",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!reserva.google_event_id) {
      return new Response(
        JSON.stringify({
          ok: true,
          evento_eliminado: false,
          mensaje:
            "La reserva no tenía evento de Google Calendar",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: integracion, error: integracionError } =
      await supabase
        .from("integraciones_calendario")
        .select(`
          calendar_id,
          refresh_token,
          conectado
        `)
        .eq("taller_id", reserva.taller_id)
        .eq("proveedor", "google")
        .maybeSingle();

    if (
      integracionError ||
      !integracion ||
      !integracion.conectado
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Google Calendar no está conectado para este taller",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const clientId =
      Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret =
      Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Faltan credenciales de Google",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
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
          refresh_token: integracion.refresh_token,
          grant_type: "refresh_token",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Error renovando token Google:",
        tokenData
      );

      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "No se pudo acceder a Google Calendar",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const calendarId =
      integracion.calendar_id || "primary";

    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        reserva.google_event_id
      )}`,
      {
        method: "DELETE",
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (
      !deleteResponse.ok &&
      deleteResponse.status !== 404 &&
      deleteResponse.status !== 410
    ) {
      const errorGoogle =
        await deleteResponse.text();

      console.error(
        "Error eliminando evento Google:",
        errorGoogle
      );

      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Google no pudo eliminar el evento",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error: limpiarError } =
      await supabase
        .from("reservas")
        .update({
          google_event_id: null,
          google_event_html_link: null,
        })
        .eq("id", reserva.id)
        .eq("taller_id", reserva.taller_id);

    if (limpiarError) {
      console.error(
        "Evento eliminado pero error limpiando ID:",
        limpiarError
      );

      return new Response(
        JSON.stringify({
          ok: true,
          evento_eliminado: true,
          aviso:
            "El evento se eliminó de Google, pero no se pudo limpiar su ID en CiTaller",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        evento_eliminado: true,
        mensaje:
          "Evento eliminado correctamente de Google Calendar",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        ok: false,
        evento_eliminado: false,
        error:
          "Error interno eliminando el evento",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});