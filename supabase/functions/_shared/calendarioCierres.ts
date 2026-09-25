import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { mensajeDeGoogle } from "./calendario.ts";
import { agruparCierres, DESCRIPCION_CIERRE, planSincronizacion, resumenCierre, sumarDias } from "./cierres.ts";
import { accessTokenDesdeRefresh, borrarEvento, crearEventoCierre, listarEventosCierre } from "./google.ts";
import { leerIntegracionGoogle } from "./tokensCalendario.ts";

// Pone los días de cierre del taller (festivos_taller) en su Google Calendar y quita los que ya no
// están. Idempotente: si no hay cambios, no toca nada. Los días ya pasados no se tocan.

/** Hasta dónde se sincroniza: algo más de un año (los festivos se cargan cada septiembre). */
const DIAS_VISTA = 400;
/** Se leen también los últimos días pasados para no partir un bloque que empezó ayer (vacaciones). */
const DIAS_ATRAS = 60;

export type ResultadoCierres =
  | { taller_id: number; creados: number; borrados: number; bloques: number }
  | { taller_id: number; motivo: "sin_calendario" }
  | { taller_id: number; error: string; creados: number; borrados: number };

export async function sincronizarCierresTaller(admin: SupabaseClient, tallerId: number, hoy: string): Promise<ResultadoCierres> {
  const integracion = await leerIntegracionGoogle(admin, tallerId);
  if (!integracion) return { taller_id: tallerId, motivo: "sin_calendario" };

  const hasta = sumarDias(hoy, DIAS_VISTA);
  const { data, error } = await admin
    .from("festivos_taller")
    .select("fecha, nombre")
    .eq("taller_id", tallerId)
    .gte("fecha", sumarDias(hoy, -DIAS_ATRAS))
    .lt("fecha", hasta);
  if (error) throw new Error(`festivos_taller: ${error.message}`);

  // Solo los bloques que aún no han terminado.
  const deseados = agruparCierres((data ?? []) as Array<{ fecha: string; nombre: string }>).filter((b) => b.finExclusivo > hoy);

  let creados = 0;
  let borrados = 0;
  try {
    const accessToken = await accessTokenDesdeRefresh(integracion.refreshToken);
    const existentes = await listarEventosCierre(accessToken, integracion.calendarId, hoy, hasta);
    const plan = planSincronizacion(deseados, existentes);
    // Primero se borra lo que sobra: si algo falla a medias, nunca quedan dos bloques para el mismo día.
    for (const id of plan.borrar) {
      await borrarEvento(accessToken, integracion.calendarId, id);
      borrados++;
    }
    for (const bloque of plan.crear) {
      await crearEventoCierre(accessToken, integracion.calendarId, {
        resumen: resumenCierre(bloque.nombre),
        descripcion: DESCRIPCION_CIERRE,
        inicio: bloque.inicio,
        finExclusivo: bloque.finExclusivo,
        clave: bloque.clave,
      });
      creados++;
    }
    return { taller_id: tallerId, creados, borrados, bloques: deseados.length };
  } catch (fallo) {
    console.error(`cierres: taller ${tallerId}:`, fallo);
    return { taller_id: tallerId, error: mensajeDeGoogle(fallo), creados, borrados };
  }
}
