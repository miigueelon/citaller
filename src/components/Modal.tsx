import { useEffect, type ReactNode } from "react";

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
    <div
      role="presentation"
      onClick={ocupado ? undefined : onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        onClick={(evento) => evento.stopPropagation()}
        style={{ background: "#fff", borderRadius: "16px", padding: "24px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}
      >
        <h2 id="modal-titulo" style={{ margin: "0 0 12px", fontSize: "20px" }}>
          {titulo}
        </h2>
        <div style={{ color: "#374151", lineHeight: 1.6 }}>{children}</div>
        <div style={{ display: "flex", gap: "12px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancelar} disabled={ocupado} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              color: "#fff",
              background: peligroso ? "#dc2626" : "#f97316",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {ocupado ? "Un momento..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
