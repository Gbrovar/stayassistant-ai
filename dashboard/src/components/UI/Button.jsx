export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  full = false
}) {

  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant} btn-${size} ${full ? "btn-full" : ""}`}
    >
      {children}
    </button>
  )
}