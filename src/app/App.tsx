import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router";
import { TallerProvider } from "./providers/TallerProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { RedireccionLegado } from "./RedireccionLegado";
import { NoEncontrado } from "./NoEncontrado";
import { ReservarPage } from "@/features/reservar/ReservarPage";

// La página de reserva (la que abren los clientes) va en el paquete principal; el resto se descarga
// solo cuando se entra en él, para que reservar desde el móvil pese lo mínimo.
const PanelPage = lazy(() => import("@/features/panel/PanelPage").then((m) => ({ default: m.PanelPage })));
const CitaClientePage = lazy(() => import("@/features/cita/CitaClientePage").then((m) => ({ default: m.CitaClientePage })));
const PrivacidadPage = lazy(() => import("@/features/sitio/PrivacidadPage").then((m) => ({ default: m.PrivacidadPage })));

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
      <Suspense fallback={<p className="cargando-pagina">Cargando…</p>}>
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
      </Suspense>
    </BrowserRouter>
  );
}
