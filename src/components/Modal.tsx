import { useEffect, type ReactNode } from "react";
import estilos from "./Modal.module.css";

interface Props {
  titulo: string;
  children: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Diálogo de confirmación (sustituye a `window.confirm`). Escape cierra. */
export function Modal({
  titulo,
  children,
  textoConfirmar = "Aceptar",
  textoCancelar = "Volver",
  peligroso = false,
  ocupado = false,
  onConfirmar,
  onCancelar,
}: Props) {
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !ocupado) onCancelar();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCancelar, ocupado]);

  return (
    <div role="presentation" className={estilos.fondo} onClick={ocupado ? undefined : onCancelar}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className={estilos.dialogo} onClick={(evento) => evento.stopPropagation()}>
        <h2 id="modal-titulo" className={estilos.titulo}>
          {titulo}
        </h2>
        <div className={estilos.cuerpo}>{children}</div>
        <div className={estilos.botones}>
          <button type="button" className={estilos.boton} onClick={onCancelar} disabled={ocupado}>
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.confirmar} ${peligroso ? estilos.peligroso : ""}`}
            onClick={onConfirmar}
            disabled={ocupado}
          >
            {ocupado ? "Un momento..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
