import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const comprobandoPertenencia = useRef(false);

  useEffect(() => {
    let vigente = true;

    // Supabase emite INITIAL_SESSION al arrancar (con la sesión guardada o sin ella) y después
    // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED o SIGNED_OUT. El usuario siempre sale de la sesión
    // del evento, así que al recargar no hay un instante sin usuario.
    const {
      data: { subscription },
    } = cliente.auth.onAuthStateChange((_evento, session) => {
      if (!vigente) return;
      // Durante el inicio de sesión se ignoran los eventos: el usuario solo entra cuando se ha
      // comprobado que pertenece a este taller.
      if (comprobandoPertenencia.current) return;
      setUsuario(session?.user ?? null);
      setCargando(false);
    });

    return () => {
      vigente = false;
      subscription.unsubscribe();
    };
  }, [cliente]);

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      comprobandoPertenencia.current = true;
      try {
        const { data, error } = await cliente.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          console.error("Error de login:", error);
          return "Email o contraseña incorrectos";
        }

        // Comprobación de pertenencia: el usuario tiene que ser el del taller de la URL.
        // (`miembros_taller` solo dice quién apunta cada cita; si algún día hay varios usuarios por
        // taller, este es el único sitio que cambia.)
        const { data: tallerUsuario, error: errorTaller } = await cliente
          .from("talleres")
          .select("id")
          .eq("id", taller.id)
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (errorTaller || !tallerUsuario) {
          // Solo en este navegador: un despiste aquí no debe cerrar el panel en el móvil del taller.
          await cliente.auth.signOut({ scope: "local" });
          return "Estas credenciales pertenecen a otro taller.";
        }

        setUsuario(data.user);
        return null;
      } finally {
        comprobandoPertenencia.current = false;
      }
    },
    [cliente, taller.id],
  );

  // "Cerrar sesión" cierra este dispositivo; la cuenta del taller la comparten móvil y ordenador.
  const cerrarSesion = useCallback(async () => {
    await cliente.auth.signOut({ scope: "local" });
    setUsuario(null);
  }, [cliente]);

  const valor = useMemo<Sesion>(
    () => ({ cliente, usuario, cargando, iniciarSesion, cerrarSesion }),
    [cliente, usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
