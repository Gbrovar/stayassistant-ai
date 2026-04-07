export default function Input({
  label,
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
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
      />
    </div>
  )
}