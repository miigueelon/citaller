import { useContext } from "react";
import { AuthContext, type Sesion } from "./contextos";

/** Sesión del panel del taller actual. Solo se puede usar dentro de un `AuthProvider`. */
export function useAuth(): Sesion {
  const sesion = useContext(AuthContext);
  if (!sesion) throw new Error("useAuth() solo puede usarse dentro de <AuthProvider>");
  return sesion;
}
