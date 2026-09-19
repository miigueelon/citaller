import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizarTelefono(telefono: string) {
  let limpio = String(telefono || "").replace(/\D/g, "");

  // Si es un móvil español de 9 cifras, añadimos 34
  if (limpio.length === 9) {
    limpio = `34${limpio}`;
  }

  return limpio;
}

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
        dia,
        hora,
        estado,
        whatsapp_confirmacion_enviada
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

    const { data: taller, error: tallerError } = await supabase
      .from("talleres")
      .select(`
        id,
        nombre,
        user_id,
        whatsapp_phone_number_id,
        whatsapp_business_account_id,
        whatsapp_activo
      `)
      .eq("id", reserva.taller_id)
      .single();

    if (tallerError || !taller) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Taller no encontrado",
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

    if (taller.user_id !== user.id) {
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

    if (reserva.whatsapp_confirmacion_enviada) {
      return new Response(
        JSON.stringify({
          ok: true,
          whatsapp_enviado: false,
          mensaje: "La confirmación ya fue enviada anteriormente",
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

    if (!taller.whatsapp_activo) {
      return new Response(
        JSON.stringify({
          ok: true,
          whatsapp_enviado: false,
          mensaje: "WhatsApp todavía no está activo para este taller",
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

    if (!taller.whatsapp_phone_number_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          whatsapp_enviado: false,
          error: "Falta whatsapp_phone_number_id del taller",
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

    const tokenWhatsApp = Deno.env.get(
      `WHATSAPP_TOKEN_TALLER_${reserva.taller_id}`
    );

    if (!tokenWhatsApp) {
      return new Response(
        JSON.stringify({
          ok: false,
          whatsapp_enviado: false,
          error: `Falta configurar el token de WhatsApp del taller ${reserva.taller_id}`,
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

    const telefonoDestino = normalizarTelefono(reserva.telefono);

    if (!telefonoDestino) {
      return new Response(
        JSON.stringify({
          ok: false,
          whatsapp_enviado: false,
          error: "El teléfono del cliente no es válido",
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

    const metaResponse = await fetch(
      `https://graph.facebook.com/v23.0/${taller.whatsapp_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenWhatsApp}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefonoDestino,
          type: "template",
          template: {
            name: "confirmacion_cita",
            language: {
              code: "es",
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: reserva.nombre || "Cliente",
                  },
                  {
                    type: "text",
                    text: taller.nombre || "Taller",
                  },
                  {
                    type: "text",
                    text: reserva.dia || "",
                  },
                  {
                    type: "text",
                    text: (reserva.hora || "").substring(0, 5),
                  },
                  {
                    type: "text",
                    text: reserva.vehiculo || "-",
                  },
                  {
                    type: "text",
                    text: reserva.servicio || "-",
                  },
                  {
                    type: "text",
                    text: reserva.matricula || "-",
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Error Meta WhatsApp:", metaData);

      return new Response(
        JSON.stringify({
          ok: false,
          whatsapp_enviado: false,
          error: "Meta rechazó el envío de WhatsApp",
          meta: metaData,
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

    const { error: updateError } = await supabase
      .from("reservas")
      .update({
        whatsapp_confirmacion_enviada: true,
        whatsapp_confirmacion_fecha: new Date().toISOString(),
      })
      .eq("id", reserva.id);

    if (updateError) {
      console.error(
        "WhatsApp enviado pero no se pudo marcar en base de datos:",
        updateError
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        whatsapp_enviado: true,
        mensaje: "WhatsApp de confirmación enviado correctamente",
        meta: metaData,
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
        whatsapp_enviado: false,
        error: "Error interno",
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