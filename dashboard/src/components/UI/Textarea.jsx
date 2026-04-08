// components/UI/Textarea.jsx
export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder
}) {
  return (
    <div className="form-field">
      {label && <label className="input-label">{label}</label>}
      <textarea
        className="input"
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}