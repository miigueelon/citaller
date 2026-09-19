import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cliente con la clave de servicio: salta RLS y grants. Solo para código de servidor;
 * toda Edge Function que lo use debe autorizar antes al usuario (ver autorizar.ts).
 */
export function crearClienteAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !clave) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno de la función");
  }
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
