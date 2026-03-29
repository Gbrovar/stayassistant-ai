import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"
import Button from "../components/UI/Button"

export default function OverviewPage() {

  const { subscription, usage, loading, conversion } = useApp()

  const {
    totalMessages,
    topIntents,
    peakHours,
    ltv
  } = useAnalytics()

  if (loading) return <div>Loading dashboard...</div>

  const limits = {
    free: 100,
    pro: 1500,
    business: 5000
  }

  const plan = subscription.plan || "free"
  const limit = limits[plan]

  const percentage = Math.min((usage / limit) * 100, 100)

  const peak =
    Object.entries(peakHours).length > 0
      ? Object.entries(peakHours)
        .sort((a, b) => b[1] - a[1])[0][0] + ":00"
      : "-"

  return (

    <div className="page">

      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Overview of your AI concierge performance.
        </p>
      </div>

      <div className="stack">

        {conversion?.show && conversion.location === "overview" && (


          <div className="card">

            <h3>
              {conversion.level === "critical"
                ? "🚨 Action required"
                : conversion.level === "high"
                  ? "⚠️ Attention needed"
                  : "💡 Opportunity"}
            </h3>

            <p>{conversion.message}</p>

            <div style={{ marginTop: 12 }}>
              <Button
                variant="primary"
                onClick={() => window.location.href = "/dashboard/billing"}
              >
                {conversion.cta}
              </Button>
            </div>

          </div>

        )}

        <p>Overview of your AI concierge performance.</p>

        <div className="kpis">

          <div className="card">
            <h3>Messages</h3>
            <p>{totalMessages}</p>
          </div>

          <div className="card">
            <h3>Top Request</h3>
            <p>{topIntents[0]?.intent || "-"}</p>
          </div>

          <div className="card">
            <h3>Peak Hour</h3>
            <p>{peak}</p>
          </div>

          <div className="card">
            <h3>Status</h3>
            <p>{usage === 0 ? "Idle" : "Active"}</p>
          </div>

        </div>

        {/* USAGE CARD */}

        <div className="card">

          <h3>Your usage</h3>

          <p>
            <strong>{usage}</strong> / {limit} messages this month
          </p>

          <div className="usage-bar">
            <div
              className="usage-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>

        </div>

        {/* QUICK INSIGHTS */}

        <div className="card">

          <h3>Quick insights</h3>

          <p>Total messages: {usage}</p>

          <p>
            Status: {usage === 0 ? "No activity yet" : "Active"}
          </p>

        </div>

      </div>
    </div>

  )

}