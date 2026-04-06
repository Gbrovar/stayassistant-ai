export default function Section({ title, children, step, isDone, isActive, onClick }) {
  return (
    <div
      className={`card card-highlight 
        ${isDone ? "section-done" : ""} 
        ${isActive ? "section-active" : "section-collapsed"}`}
      onClick={!isActive ? onClick : undefined}
      style={{ cursor: !isActive ? "pointer" : "default" }}
    >

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          <div style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: isDone ? "#22c55e" : "#1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12
          }}>
            {isDone ? "✓" : step}
          </div>

          <h3 className="section-title" style={{ margin: 0 }}>
            {title}
          </h3>

        </div>

        {isDone && (
          <span style={{ fontSize: 12, color: "#22c55e" }}>
            Completed
          </span>
        )}

      </div>

      {isActive && (
        <div className="stack">
          {children}
        </div>
      )}

    </div>
  )
}