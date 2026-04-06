
export default function AIStatusCard({ kpis, upgrade }) {

  const ratio = kpis.usage_pct

  let status = "Healthy"
  let color = "#22c55e"

  if (ratio > 0.8) {
    status = "High usage"
    color = "#f59e0b"
  }

  if (ratio >= 1) {
    status = "Limit reached"
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
          {kpis.messages} of {kpis.usage_limit} messages used
        </p>
      </div>

      {upgrade && (
        <div className="inline-upgrade">
          <p>{upgrade.message}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = "/billing"}
          >
            Upgrade
          </button>
        </div>
      )}

    </div>
  )
}