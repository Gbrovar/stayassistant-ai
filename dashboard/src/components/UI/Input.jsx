export default function Input({ value, onChange, placeholder, type = "text" }) {

  return (

    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, opacity: 0.7 }}>
        Check-in
      </label>
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