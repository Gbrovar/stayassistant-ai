import React from "react"

function InputComponent({
  label,
  name,
  value,
  onChange,
  onBlur,
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
        onBlur={onBlur}
        placeholder={placeholder}
        type={type}
      />
    </div>
  )
}

export default React.memo(InputComponent)