import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { clienteTaller } from "@/lib/supabase/client";
import { AuthContext, type Sesion } from "./contextos";
import { useTaller } from "./useTaller";

/**
 * Sesión del panel del taller actual. Cada taller tiene su propio cliente (y su propia sesión
 * guardada), así que la sesión de un taller nunca abre el panel de otro.
 * Se monta dentro de `TallerProvider` (que lleva `key={slug}`), así que al cambiar de taller se
 * reinicia entero.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const taller = useTaller();
  const cliente = useMemo(() => clienteTaller(taller.id), [taller.id]);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;

    cliente.auth.getSession().then(({ data: { session } }) => {
      if (!vigente) return;
      setUsuario(session?.user ?? null);
      setCargando(false);
    });

    const {
      data: { subscription },
    } = cliente.auth.onAuthStateChange((evento, session) => {
      if (!vigente) return;
      if (evento === "SIGNED_OUT") setUsuario(null);
      if (evento === "TOKEN_REFRESHED" && session?.user) setUsuario(session.user);
      setCargando(false);
    });

    return () => {
      vigente = false;
      subscription.unsubscribe();
    };
  }, [cliente]);

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { data, error } = await cliente.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        console.error("Error de login:", error);
        return "Email o contraseña incorrectos";
      }

      // Comprobación de pertenencia: el usuario tiene que ser el del taller de la URL.
      // (En la fase 5 pasa a la tabla `miembros_taller`; este es el único sitio que cambia.)
      const { data: tallerUsuario, error: errorTaller } = await cliente
        .from("talleres")
        .select("id")
        .eq("id", taller.id)
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (errorTaller || !tallerUsuario) {
        await cliente.auth.signOut();
        return "Estas credenciales pertenecen a otro taller.";
      }

      setUsuario(data.user);
      return null;
    },
    [cliente, taller.id],
  );

  const cerrarSesion = useCallback(async () => {
    await cliente.auth.signOut();
    setUsuario(null);
  }, [cliente]);

  const valor = useMemo<Sesion>(
    () => ({ cliente, usuario, cargando, iniciarSesion, cerrarSesion }),
    [cliente, usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
