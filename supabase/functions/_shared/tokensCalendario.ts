import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Acceso a los refresh tokens de calendario guardados en Supabase Vault, a través de las
// funciones SQL guardar_token_calendario / leer_token_calendario (solo service_role).
// Migración: supabase/migrations/20260919220100_tokens_calendario_en_vault.sql

export interface IntegracionCalendario {
  refreshToken: string;
  calendarId: string;
}

/** Integración de Google conectada del taller, o null si no hay o está desconectada. */
export async function leerIntegracionGoogle(
  admin: SupabaseClient,
  tallerId: number,
): Promise<IntegracionCalendario | null> {
  const { data, error } = await admin.rpc("leer_token_calendario", {
    p_taller_id: tallerId,
    p_proveedor: "google",
  });
  if (error) throw new Error(`leer_token_calendario: ${error.message}`);

  const fila = Array.isArray(data) ? data[0] : null;
  if (!fila || !fila.conectado || !fila.refresh_token) return null;
  return { refreshToken: fila.refresh_token, calendarId: fila.calendar_id || "primary" };
}

/** Guarda (o sustituye) el refresh token en Vault y marca la integración como conectada. */
export async function guardarRefreshTokenGoogle(
  admin: SupabaseClient,
  tallerId: number,
  refreshToken: string,
  scope: string | null,
): Promise<void> {
  const { error } = await admin.rpc("guardar_token_calendario", {
    p_taller_id: tallerId,
    p_proveedor: "google",
    p_refresh_token: refreshToken,
    p_scope: scope,
  });
  if (error) throw new Error(`guardar_token_calendario: ${error.message}`);
}
