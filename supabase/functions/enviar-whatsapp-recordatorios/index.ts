import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fechaMananaMadrid() {
  const ahora = new Date();

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);

  const year = Number(
    partes.find((p) => p.type === "year")?.value
  );

  const month = Number(
    partes.find((p) => p.type === "month")?.value
  );

  const day = Number(
    partes.find((p) => p.type === "day")?.value
  );

  const manana = new Date(
    Date.UTC(year, month - 1, day + 1)
  );

  return manana.toISOString().slice(0, 10);
}

function normalizarTelefono(telefono: string) {
  let limpio = String(telefono || "").replace(/\D/g, "");

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
    // ========================================
    // SEGURIDAD DEL CRON
    // ========================================

    const cronSecret = Deno.env.get("CITALLER_CRON_SECRET");
    const recibido = req.headers.get("x-cron-secret");

    if (!cronSecret || recibido !== cronSecret) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Cron no autorizado",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const manana = fechaMananaMadrid();

    // ========================================
    // BUSCAR CITAS DE MAÑANA
    // ========================================

    const { data: reservas, error } = await supabase
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
        whatsapp_recordatorio_enviado
      `)
      .eq("estado", "Confirmada")
      .eq("dia", manana)
      .eq("whatsapp_recordatorio_enviado", false);

    if (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message,
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

    const resultados = [];

    // ========================================
    // PROCESAR CADA RESERVA
    // ========================================

    for (const reserva of reservas || []) {
      try {
        const { data: taller, error: tallerError } =
          await supabase
            .from("talleres")
            .select(`
              id,
              nombre,
              whatsapp_phone_number_id,
              whatsapp_business_account_id,
              whatsapp_activo
            `)
            .eq("id", reserva.taller_id)
            .single();

        if (tallerError || !taller) {
          resultados.push({
            reserva_id: reserva.id,
            enviado: false,
            motivo: "Taller no encontrado",
          });

          continue;
        }

        if (!taller.whatsapp_activo) {
          resultados.push({
            reserva_id: reserva.id,
            taller_id: reserva.taller_id,
            enviado: false,
            motivo:
              "WhatsApp todavía no está activo para este taller",
          });

          continue;
        }

        if (!taller.whatsapp_phone_number_id) {
          resultados.push({
            reserva_id: reserva.id,
            taller_id: reserva.taller_id,
            enviado: false,
            motivo:
              "Falta whatsapp_phone_number_id del taller",
          });

          continue;
        }

        const tokenWhatsApp = Deno.env.get(
          `WHATSAPP_TOKEN_TALLER_${reserva.taller_id}`
        );

        if (!tokenWhatsApp) {
          resultados.push({
            reserva_id: reserva.id,
            taller_id: reserva.taller_id,
            enviado: false,
            motivo:
              `Falta configurar el token de WhatsApp del taller ${reserva.taller_id}`,
          });

          continue;
        }

        const telefonoDestino =
          normalizarTelefono(reserva.telefono);

        if (!telefonoDestino) {
          resultados.push({
            reserva_id: reserva.id,
            enviado: false,
            motivo: "Teléfono del cliente no válido",
          });

          continue;
        }

        // Puedes cambiar esta versión cuando Meta
        // requiera una versión Graph más reciente.
        const graphVersion =
          Deno.env.get("META_GRAPH_VERSION") || "v23.0";

        // ========================================
        // ENVÍO REAL A META
        // ========================================

        const metaResponse = await fetch(
          `https://graph.facebook.com/${graphVersion}/${taller.whatsapp_phone_number_id}/messages`,
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
                name: "recordatorio_cita",
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
                        text:
                          (reserva.hora || "").substring(0, 5),
                      },
                      {
                        type: "text",
                        text: reserva.vehiculo || "-",
                      },
                      {
                        type: "text",
                        text: reserva.servicio || "-",
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
          console.error(
            "Error Meta recordatorio:",
            metaData
          );

          resultados.push({
            reserva_id: reserva.id,
            taller_id: reserva.taller_id,
            enviado: false,
            motivo: "Meta rechazó el recordatorio",
          });

          continue;
        }

        // ========================================
        // MARCAR COMO ENVIADO
        // ========================================

        const { error: updateError } = await supabase
          .from("reservas")
          .update({
            whatsapp_recordatorio_enviado: true,
            whatsapp_recordatorio_fecha:
              new Date().toISOString(),
          })
          .eq("id", reserva.id);

        if (updateError) {
          console.error(
            "WhatsApp enviado pero error guardando estado:",
            updateError
          );
        }

        resultados.push({
          reserva_id: reserva.id,
          taller_id: reserva.taller_id,
          enviado: true,
          motivo: "Recordatorio enviado correctamente",
        });
      } catch (errorReserva) {
        console.error(
          "Error procesando recordatorio:",
          errorReserva
        );

        resultados.push({
          reserva_id: reserva.id,
          enviado: false,
          motivo: "Error interno procesando la reserva",
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fecha_buscada: manana,
        total_recordatorios:
          reservas?.length || 0,
        resultados,
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