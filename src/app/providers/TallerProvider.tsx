import { useEffect, useState, type ReactNode } from "react";
import { cargarTallerPorSlug, type Taller } from "@/features/taller/api";
import { NoEncontrado } from "@/app/NoEncontrado";
import { PantallaCargando } from "@/components/PantallaCargando";
import { TallerContext } from "./contextos";

interface Props {
  slug: string;
  children: ReactNode;
}

type Estado = { fase: "cargando" } | { fase: "listo"; taller: Taller } | { fase: "no-existe" } | { fase: "error" };

/**
 * Carga el taller de la URL (`/<slug>`) y lo pone a disposición de toda la página.
 * Si el slug no existe o el taller está inactivo, muestra la página de "no encontrado".
 * Quien lo monte debe darle `key={slug}` para que un cambio de taller lo reinicie.
 */
export function TallerProvider({ slug, children }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  useEffect(() => {
    let vigente = true;

    cargarTallerPorSlug(slug)
      .then((taller) => {
        if (vigente) setEstado(taller ? { fase: "listo", taller } : { fase: "no-existe" });
      })
      .catch((error: unknown) => {
        console.error("Error cargando el taller:", error);
        if (vigente) setEstado({ fase: "error" });
      });

    return () => {
      vigente = false;
    };
  }, [slug]);

  if (estado.fase === "cargando") return <PantallaCargando />;
  if (estado.fase === "no-existe") return <NoEncontrado mensaje="No encontramos ningún taller con esa dirección." />;
  if (estado.fase === "error") return <NoEncontrado mensaje="No se pudo cargar el taller. Vuelve a intentarlo en unos minutos." />;

  return <TallerContext.Provider value={estado.taller}>{children}</TallerContext.Provider>;
}
