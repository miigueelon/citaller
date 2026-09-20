import { BrowserRouter, Route, Routes, useParams } from "react-router";
import { TallerProvider } from "./providers/TallerProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { RedireccionLegado } from "./RedireccionLegado";
import { NoEncontrado } from "./NoEncontrado";
import { ReservarPage } from "@/features/reservar/ReservarPage";
import { PanelPage } from "@/features/panel/PanelPage";
import { CitaClientePage } from "@/features/cita/CitaClientePage";

/** Envuelve una página con el taller de la URL. */
function ConTaller({ children }: { children: React.ReactNode }) {
  const { slug = "" } = useParams();
  return (
    <TallerProvider key={slug} slug={slug}>
      {children}
    </TallerProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedireccionLegado />} />
        <Route
          path="/:slug"
          element={
            <ConTaller>
              <ReservarPage />
            </ConTaller>
          }
        />
        <Route
          path="/:slug/panel"
          element={
            <ConTaller>
              <AuthProvider>
                <PanelPage />
              </AuthProvider>
            </ConTaller>
          }
        />
        <Route
          path="/:slug/cita/:token"
          element={
            <ConTaller>
              <CitaClientePage />
            </ConTaller>
          }
        />
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </BrowserRouter>
  );
}
