import type { ChangeEventHandler } from "react";

interface Props {
  label: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
}

/** Campo de texto con etiqueta flotante (el `placeholder=" "` es lo que activa el efecto en CSS). */
export default function CampoInput({ label, type = "text", name, value, onChange }: Props) {
  return (
    <div className="campo-input">
      <input type={type} name={name} value={value} onChange={onChange} placeholder=" " required />
      <label>{label}</label>
    </div>
  );
}
