import type { ChangeEventHandler, HTMLInputAutoCompleteAttribute } from "react";

interface Props {
  label: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  autoComplete?: HTMLInputAutoCompleteAttribute;
  /** Mensaje de error bajo el campo; también marca el campo como inválido. */
  error?: string;
}

/**
 * Campo de texto con etiqueta flotante. El `placeholder=" "` es lo que activa el efecto en CSS,
 * así que no se admite un placeholder propio: la etiqueta hace de pista.
 */
export default function CampoInput({ label, type = "text", name, value, onChange, inputMode, autoComplete, error }: Props) {
  const idError = error ? `${name}-error` : undefined;
  return (
    <div className={`campo-input ${error ? "campo-input-error" : ""}`}>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder=" "
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={idError}
      />
      <label htmlFor={name}>{label}</label>
      {error && (
        <p id={idError} className="campo-error">
          {error}
        </p>
      )}
    </div>
  );
}
