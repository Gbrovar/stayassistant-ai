export default function OpportunitiesCard({ insights, actions }) {

  if (!insights?.length && !actions?.length) return null

  function handleAction(action) {

    if (action.type === "faq") {
      window.location.href = "/dashboard/property-setup?tab=faq"
      return
    }

    if (action.type === "usage") {
      window.location.href = "/dashboard/billing"
      return
    }

    // fallback seguro
    window.location.href = "/dashboard"
  }

  return (
    <div className="card">
      <h3>AI Opportunities</h3>

      {/* INSIGHTS (información) */}
      {insights?.map((text, i) => (
        <div key={`insight-${i}`} className="card card-soft">
          <p>{text}</p>
        </div>
      ))}

      {/* ACTIONS (acciones reales) */}
      {actions?.map((a, i) => (

        <div key={`action-${i}`} className="card card-soft">

          {/* Texto */}
          <p style={{ marginBottom: 8 }}>
            {a.text}
          </p>

          {/* Impact label */}
          {a.impact && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color:
                  a.impact === "high"
                    ? "#f59e0b"
                    : "#94a3b8",
                marginBottom: 8,
                display: "inline-block"
              }}
            >
              {a.impact === "high" ? "🔥 High impact" : "Medium impact"}
            </span>
          )}

          {/* CTA */}
          <div>
            <button
              className="btn btn-secondary"
              onClick={() => handleAction(a)}
            >
              {a.type === "faq"
                ? "Fix FAQ"
                : a.type === "usage"
                  ? "Upgrade plan"
                  : "Take action"}
            </button>
          </div>

        </div>

      ))}

    </div>
  )
}