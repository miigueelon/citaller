import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const SUPABASE_URL = env.supabaseUrl;
const SUPABASE_ANON_KEY = env.supabaseAnonKey;

// ========================================
// CACHE DE CLIENTES POR TALLER
// ========================================

const clientesTaller = new Map();

// ========================================
// CLIENTE AUTENTICADO POR TALLER
// ========================================

export function crearSupabaseTaller(tallerId) {
  const clave = String(tallerId);

  if (clientesTaller.has(clave)) {
    return clientesTaller.get(clave);
  }

  const cliente = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        storageKey: `citaller-auth-${clave}`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  clientesTaller.set(clave, cliente);

  return cliente;
}

// ========================================
// CLIENTE PÚBLICO
// ========================================

export const supabasePublic = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "citaller-public",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
