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
        // Si el seed ya escribió "(opcional)" en la etiqueta, se quita: aquí se añade en un solo sitio.
        const etiqueta = campo.etiqueta.replace(/\s*\(opcional\)/i, "");
        const opcional = !campo.obligatorio;
        return (
          <div className="descripcion-servicio" key={campo.id}>
            {campo.tipo === "select" ? (
              <>
                <label htmlFor={id}>
                  {etiqueta}
                  {opcional && " (opcional)"}
                </label>
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
              </>
            ) : (
              // Una sola etiqueta, la flotante, como en el resto de campos del formulario.
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
                <label htmlFor={id}>
                  {etiqueta}
                  {campo.unidad && ` (${campo.unidad})`}
                  {opcional && " · opcional"}
                </label>
              </div>
            )}

            {campo.ayuda && <p className="ayuda-descripcion">{campo.ayuda}</p>}
          </div>
        );
      })}
    </>
  );
}
