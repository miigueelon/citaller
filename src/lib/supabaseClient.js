import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://zrrqqqbgwwovmglhqxwn.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_lI2UNnTiAxmRVW3GtQehAw_0QDJsvIj";

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