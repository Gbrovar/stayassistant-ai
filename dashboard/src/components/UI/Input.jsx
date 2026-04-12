export default function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text"
}) {
  return (
    <div className="form-field">
      {label && <label className="input-label">{label}</label>}

      <input
        className="input"
        name={name}              // 🔥 CRÍTICO
        value={value || ""}     // 🔥 evita uncontrolled
        onChange={onChange}
        placeholder={placeholder}
        type={type}
      />
    </div>
  )
}