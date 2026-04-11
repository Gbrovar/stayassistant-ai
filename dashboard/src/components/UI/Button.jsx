export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  full = false,
  ...props
}) {

  const base = "btn"
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : "btn-secondary"

  const sizeClass =
    size === "sm"
      ? "btn-sm"
      : size === "lg"
        ? "btn-lg"
        : "btn-md"

  const fullClass = full ? "btn-full" : ""

  return (
    <button
      onClick={onClick}
      className={`${base} ${variantClass} ${sizeClass} ${fullClass}`}
      {...props}
    >
      {children}
    </button>
  )
}