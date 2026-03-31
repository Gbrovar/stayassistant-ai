import { useApp } from "../../context/AppContext"

export default function AIStatusCard() {
  const { usage, limit, subscription, conversion } = useApp()

  const ratio = usage / limit

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
    <div className="card card-highlight">

      <div className="card-header">
        <h3>AI Status</h3>
        <span style={{ color }}>{status}</span>
      </div>

      <div className="card-body">
        <p>Your assistant is currently <strong>{status}</strong></p>

        <p className="text-muted">
          {usage} of {limit} messages used this month
        </p>
      </div>

      {conversion?.show && (
        <div className="inline-upgrade">
          <p>{conversion.message}</p>
          <button className="btn btn-primary"
            onClick={() => window.location.href = "/billing"}>
            {conversion.cta}
          </button>
        </div>
      )}

    </div>
  )
}