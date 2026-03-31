export default function Section({ title, children }) {
  return (
    <div className="card card-highlight">
      <h3 className="section-title">{title}</h3>

      <div className="stack">
        {children}
      </div>
    </div>
  )
}