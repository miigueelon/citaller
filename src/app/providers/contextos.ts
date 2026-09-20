import { createContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Taller } from "@/features/taller/api";
import type { ClienteSupabase } from "@/lib/supabase/client";

export const TallerContext = createContext<Taller | null>(null);

export interface Sesion {
  /** Cliente de Supabase con la sesión de este taller. */
  cliente: ClienteSupabase;
  /** Usuario con sesión iniciada, o null. */
  usuario: User | null;
  /** True mientras se comprueba si había una sesión guardada. */
  cargando: boolean;
  /** Inicia sesión y comprueba que el usuario pertenece al taller. Devuelve el mensaje de error, o null si entró. */
  iniciarSesion: (email: string, password: string) => Promise<string | null>;
  cerrarSesion: () => Promise<void>;
}

export const AuthContext = createContext<Sesion | null>(null);
