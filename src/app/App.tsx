import { BrowserRouter, Route, Routes, useParams } from "react-router";
import { TallerProvider } from "./providers/TallerProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { RedireccionLegado } from "./RedireccionLegado";
import { NoEncontrado } from "./NoEncontrado";
import { ReservarPage } from "@/features/reservar/ReservarPage";
import { PanelPage } from "@/features/panel/PanelPage";
import { CitaClientePage } from "@/features/cita/CitaClientePage";
import { PrivacidadPage } from "@/features/sitio/PrivacidadPage";

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
        {/* `/` es la página principal; con `?taller=N` sigue redirigiendo a las rutas antiguas. */}
        <Route path="/" element={<RedireccionLegado />} />
        {/* Las rutas fijas van antes que `/:slug`: ningún taller puede llamarse así. */}
        <Route path="/privacidad" element={<PrivacidadPage />} />
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
