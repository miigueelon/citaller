import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cargarTallerPorId } from "@/features/taller/api";
import { NoEncontrado } from "./NoEncontrado";
import { PantallaCargando } from "@/components/PantallaCargando";

/**
 * Las URLs antiguas (`/?taller=2`, `/?taller=2&modo=taller`) siguen funcionando: se traducen a
 * `/<slug>` y `/<slug>/panel` conservando el resto de parámetros (por ejemplo `calendar=connected`,
 * con el que vuelve Google). Sin `?taller=` no hay taller que mostrar: cada taller tiene su enlace.
 */
export function RedireccionLegado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [noExiste, setNoExiste] = useState(false);

  const tallerId = Number(params.get("taller"));
  const sinTaller = !Number.isInteger(tallerId) || tallerId <= 0;

  useEffect(() => {
    if (sinTaller) return;
    let vigente = true;
    const esPanel = params.get("modo") === "taller";

    cargarTallerPorId(tallerId)
      .then((taller) => {
        if (!vigente) return;
        if (!taller) {
          setNoExiste(true);
          return;
        }
        const resto = new URLSearchParams(params);
        resto.delete("taller");
        resto.delete("modo");
        const consulta = resto.toString();
        navigate(`/${taller.slug}${esPanel ? "/panel" : ""}${consulta ? `?${consulta}` : ""}`, { replace: true });
      })
      .catch((error: unknown) => {
        console.error("Error resolviendo la URL antigua:", error);
        if (vigente) setNoExiste(true);
      });

    return () => {
      vigente = false;
    };
  }, [params, navigate, tallerId, sinTaller]);

  if (sinTaller) return <NoEncontrado mensaje="Cada taller tiene su propio enlace de reserva. Usa el que te haya dado el tuyo." />;
  if (noExiste) return <NoEncontrado mensaje="No encontramos ningún taller con esa dirección." />;
  return <PantallaCargando />;
}
