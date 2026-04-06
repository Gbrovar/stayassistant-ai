
export default function AIStatusCard({ kpis, upgrade }) {

  const ratio = kpis.usage_pct

  let status = "Healthy"
  let message = "Your assistant is running smoothly"
  let color = "#22c55e"

  if (ratio > 0.8 && ratio < 1) {
    status = "Near capacity"
    message = "You're approaching your plan limit"
    color = "#f59e0b"
  }

  if (ratio >= 1) {
    status = "Limit reached"
    message = "You have reached your plan limit"
    color = "#ef4444"
  }

  return (
    <div className="card">

      <div className="card-header">
        <h3>AI Status</h3>
        <span>{status}</span>
      </div>

      <div className="card-body">
        <p>Your assistant is currently <strong>{status}</strong></p>

        <p className="text-muted">
          {message}
        </p>
      </div>

      {ratio > 0.7 && (
        <div className="inline-upgrade">

          <p>
            You're using {Math.round(ratio * 100)}% of your plan
          </p>

          <button
            className="btn btn-primary"
            onClick={() => window.location.href = "/billing"}
          >
            Upgrade to avoid interruptions
          </button>

        </div>
      )}

    </div>
  )
}