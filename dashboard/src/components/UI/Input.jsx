export default function Input({ value, onChange, placeholder, type = "text" }) {

  return (

    <input
      className="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
    />

  )

}