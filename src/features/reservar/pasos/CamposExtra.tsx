import type { ChangeEvent } from "react";
import type { CampoFormulario } from "@/features/taller/api";

interface Props {
  campos: CampoFormulario[];
  valores: Record<string, string>;
  onCambio: (clave: string, valor: string) => void;
}

/** Campos extra definidos por el taller (`campos_formulario_taller`): número, texto o desplegable. */
export function CamposExtra({ campos, valores, onCambio }: Props) {
  if (campos.length === 0) return null;

  function alCambiar(campo: CampoFormulario) {
    return (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const valor = campo.tipo === "numero" ? evento.target.value.replace(/\D/g, "") : evento.target.value;
      onCambio(campo.clave, valor);
    };
  }

  return (
    <>
      {campos.map((campo) => {
        const id = `campo-${campo.clave}`;
        const etiqueta = campo.obligatorio ? campo.etiqueta : `${campo.etiqueta}${campo.etiqueta.includes("opcional") ? "" : " (opcional)"}`;
        return (
          <div className="descripcion-servicio" key={campo.id}>
            <label htmlFor={id}>{etiqueta}</label>

            {campo.tipo === "select" ? (
              <select id={id} name={campo.clave} value={valores[campo.clave] ?? ""} onChange={alCambiar(campo)} required={campo.obligatorio}>
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {(campo.opciones ?? []).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            ) : (
              <div className="campo-input">
                <input
                  id={id}
                  name={campo.clave}
                  type="text"
                  inputMode={campo.tipo === "numero" ? "numeric" : "text"}
                  value={valores[campo.clave] ?? ""}
                  onChange={alCambiar(campo)}
                  placeholder=" "
                  required={campo.obligatorio}
                />
                <label htmlFor={id}>{campo.unidad ? `${campo.etiqueta} (${campo.unidad})` : campo.etiqueta}</label>
              </div>
            )}

            {campo.ayuda && <p className="ayuda-descripcion">{campo.ayuda}</p>}
          </div>
        );
      })}
    </>
  );
}
