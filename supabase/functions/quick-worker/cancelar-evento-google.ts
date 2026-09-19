import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sumarMinutos(
  dia: string,
  hora: string,
  minutos: number
) {
  const [year, month, day] = dia.split("-").map(Number);
  const [hour, minute] = hora.substring(0, 5).split(":").map(Number);

  const fecha = new Date(
    Date.UTC(year, month - 1, day, hour, minute)
  );

  fecha.setUTCMinutes(fecha.getUTCMinutes() + minutos);

  return fecha.toISOString().slice(0, 19);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // ========================================
    // COMPROBAR USUARIO AUTENTICADO
    // ========================================

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

    // ========================================
    // LEER RESERVA
    // ========================================

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

    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select(`
        id,
        taller_id,
        nombre,
        telefono,
        matricula,
        vehiculo,
        servicio,
        descripcion,
        dia,
        hora,
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

    if (reserva.estado !== "Confirmada") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "La reserva todavía no está confirmada",
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

    // Evitar duplicados
    if (reserva.google_event_id) {
      return new Response(
        JSON.stringify({
          ok: true,
          evento_creado: false,
          mensaje: "Esta reserva ya tiene evento en Google Calendar",
          google_event_id: reserva.google_event_id,
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

    // ========================================
    // COMPROBAR TALLER
    // ========================================

    const { data: taller, error: tallerError } = await supabase
      .from("talleres")
      .select(`
        id,
        nombre,
        user_id
      `)
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

    // ========================================
    // BUSCAR INTEGRACIÓN GOOGLE
    // ========================================

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
          error: "Google Calendar no está conectado para este taller",
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

    // ========================================
    // RENOVAR ACCESS TOKEN
    // ========================================

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

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
          error: "No se pudo renovar el acceso a Google Calendar",
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

    const accessToken = tokenData.access_token;

    // ========================================
    // PREPARAR EVENTO
    // ========================================

    const horaInicio = reserva.hora.substring(0, 5);

    const fechaHoraInicio =
      `${reserva.dia}T${horaInicio}:00`;

    // De momento 60 minutos
    const fechaHoraFin = sumarMinutos(
      reserva.dia,
      horaInicio,
      60
    );

    const descripcion = [
      `Cliente: ${reserva.nombre || "-"}`,
      `Teléfono: ${reserva.telefono || "-"}`,
      `Vehículo: ${reserva.vehiculo || "-"}`,
      `Matrícula: ${reserva.matricula || "-"}`,
      `Servicio: ${reserva.servicio || "-"}`,
      reserva.descripcion
        ? `Descripción: ${reserva.descripcion}`
        : null,
      `Reserva CiTaller #${reserva.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    const calendarId =
      integracion.calendar_id || "primary";

    // ========================================
    // CREAR EVENTO EN GOOGLE CALENDAR
    // ========================================

    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary:
            `${reserva.servicio} · ${reserva.nombre}`,

          description: descripcion,

          start: {
            dateTime: fechaHoraInicio,
            timeZone: "Europe/Madrid",
          },

          end: {
            dateTime: fechaHoraFin,
            timeZone: "Europe/Madrid",
          },

          reminders: {
            useDefault: true,
          },
        }),
      }
    );

    const evento = await eventResponse.json();

    if (!eventResponse.ok) {
      console.error(
        "Error creando evento Google:",
        evento
      );

      return new Response(
        JSON.stringify({
          ok: false,
          evento_creado: false,
          error:
            "Google Calendar rechazó la creación del evento",
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

    // ========================================
    // GUARDAR ID DEL EVENTO
    // ========================================

    const { error: guardarError } = await supabase
      .from("reservas")
      .update({
        google_event_id: evento.id,
        google_event_html_link:
          evento.htmlLink || null,
      })
      .eq("id", reserva.id)
      .eq("taller_id", reserva.taller_id);

    if (guardarError) {
      console.error(
        "Evento creado pero error guardando ID:",
        guardarError
      );

      return new Response(
        JSON.stringify({
          ok: true,
          evento_creado: true,
          aviso:
            "Evento creado, pero no se pudo guardar su ID en CiTaller",
          google_event_id: evento.id,
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
        evento_creado: true,
        mensaje:
          "Evento creado correctamente en Google Calendar",
        google_event_id: evento.id,
        google_event_html_link:
          evento.htmlLink || null,
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
        evento_creado: false,
        error: "Error interno creando el evento",
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