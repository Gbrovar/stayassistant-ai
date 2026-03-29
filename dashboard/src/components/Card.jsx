export default function Card({ children, style, className = "" }) {

  return (
    <div
      className={`card ${className}`}
      style={{
        padding: "20px",
        ...style
      }}
    >
      {children}
    </div>
  )

}