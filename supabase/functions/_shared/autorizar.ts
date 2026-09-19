import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2";

/** Usuario de Supabase Auth dueño del JWT de la cabecera Authorization, o null. */
export async function usuarioDeLaPeticion(
  req: Request,
  admin: SupabaseClient,
): Promise<User | null> {
  const cabecera = req.headers.get("Authorization") ?? "";
  if (!cabecera.startsWith("Bearer ")) return null;

  const { data, error } = await admin.auth.getUser(cabecera.slice("Bearer ".length));
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * ¿Puede este usuario gestionar este taller? Hoy: es el `user_id` del taller.
 * En la fase 4 pasa a comprobar `miembros_taller`; es el único sitio que hay que cambiar.
 */
export async function puedeGestionarTaller(
  admin: SupabaseClient,
  userId: string,
  tallerId: number,
): Promise<boolean> {
  const { data, error } = await admin
    .from("talleres")
    .select("id")
    .eq("id", tallerId)
    .eq("user_id", userId)
    .maybeSingle();
  return !error && data !== null;
}
