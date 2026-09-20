import { useAuth } from "@/app/providers/useAuth";
import { useTaller } from "@/app/providers/useTaller";
import { PantallaCargando } from "@/components/PantallaCargando";
import { LoginPage } from "./LoginPage";
import PanelTaller from "@/components/PanelTaller";

/** Panel del taller: pide sesión y, con ella, muestra las reservas. */
export function PanelPage() {
  const taller = useTaller();
  const { cargando, usuario, cliente } = useAuth();

  if (cargando) return <PantallaCargando />;
  if (!usuario) return <LoginPage />;

  return <PanelTaller supabaseClient={cliente} tallerId={taller.id} slug={taller.slug} />;
}
