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
 * (`miembros_taller` solo dice quién apunta cada cita; si algún día hay varios usuarios por taller, este es el único sitio que cambia.)
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
