import type { ReactNode } from "react";

interface Props {
  tipo?: "ok" | "error" | "aviso";
  children: ReactNode;
  onCerrar?: () => void;
}

const COLORES = {
  ok: { fondo: "#ecfdf5", borde: "#a7f3d0", texto: "#065f46" },
  error: { fondo: "#fef2f2", borde: "#fecaca", texto: "#991b1b" },
  aviso: { fondo: "#fff7ed", borde: "#fed7aa", texto: "#9a3412" },
};

/** Mensaje en línea (sustituye a `alert`). */
export function Alerta({ tipo = "aviso", children, onCerrar }: Props) {
  const color = COLORES[tipo];
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: color.fondo,
        border: `1px solid ${color.borde}`,
        color: color.texto,
        borderRadius: "12px",
        padding: "12px 16px",
        margin: "12px 0",
        fontSize: "15px",
        lineHeight: 1.5,
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
