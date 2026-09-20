import type { ReactNode } from "react";
import estilos from "./Alerta.module.css";

interface Props {
  tipo?: "ok" | "error" | "aviso";
  children: ReactNode;
  onCerrar?: () => void;
}

/** Mensaje en línea (sustituye a `alert`). */
export function Alerta({ tipo = "aviso", children, onCerrar }: Props) {
  return (
    <div role="alert" className={`${estilos.alerta} ${estilos[tipo]}`}>
      <div className={estilos.contenido}>{children}</div>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className={estilos.cerrar}>
          ×
        </button>
      )}
    </div>
  );
}
