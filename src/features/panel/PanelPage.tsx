import { useAuth } from "@/app/providers/useAuth";
import { PantallaCargando } from "@/components/PantallaCargando";
import { LoginPage } from "./LoginPage";
import { PanelTaller } from "./PanelTaller";

/** Panel del taller: pide sesión y, con ella, muestra las reservas. */
export function PanelPage() {
  const { cargando, usuario } = useAuth();

  if (cargando) return <PantallaCargando />;
  if (!usuario) return <LoginPage />;

  return <PanelTaller />;
}
