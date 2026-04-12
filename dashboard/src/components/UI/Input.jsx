import React from "react"

function InputComponent({
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
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
      />
    </div>
  )
}

export default React.memo(InputComponent)