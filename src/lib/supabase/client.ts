import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { Database } from "./database.types";

export type ClienteSupabase = SupabaseClient<Database>;

/**
 * Cliente público (rol anon): página de reserva y consulta de citas. No guarda sesión.
 */
export const supabasePublic: ClienteSupabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storageKey: "citaller-public",
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const clientesPorTaller = new Map<number, ClienteSupabase>();

/**
 * Cliente autenticado del panel de un taller. Cada taller guarda su sesión con su propia clave,
 * así que en un mismo navegador pueden convivir sesiones de talleres distintos.
 * `detectSessionInUrl` va desactivado: la vuelta del OAuth de Google llega con parámetros de
 * consulta normales (`calendar=...`), nunca con tokens de sesión.
 */
export function clienteTaller(tallerId: number): ClienteSupabase {
  const existente = clientesPorTaller.get(tallerId);
  if (existente) return existente;

  const cliente = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storageKey: `citaller-auth-${tallerId}`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  clientesPorTaller.set(tallerId, cliente);
  return cliente;
}
