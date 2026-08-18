export default function CampoInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder
}) {
  return (
    <div className="campo-input">

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        required
      />

      <label>{label}</label>

    </div>
  );
}