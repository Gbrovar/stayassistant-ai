export default function Section({
  title,
  children,
  step,
  isDone,
  isActive,
  onClick
}) {

  return (
    <div
      className={`
        card-v2 section
        ${isDone ? "section-done" : ""}
        ${isActive ? "section-active" : "section-collapsed"}
      `}
      onClick={!isActive ? onClick : undefined}
    >

      <div className="section-header">

        <div className="section-left">

          <div className={`section-step ${isDone ? "done" : ""}`}>
            {isDone ? "✓" : step}
          </div>

          <h3 className="section-title">
            {title}
          </h3>

        </div>

        {isDone && (
          <span className="section-status">
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