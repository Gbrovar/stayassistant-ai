import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"

export default function OverviewPage() {

  const { subscription, usage, loading } = useApp()

  const {
    totalMessages,
    topIntents,
    peakHours,
    hasData
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

  return (

    <div>

      <h1>Dashboard</h1>

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
          <p>
            {Object.entries(peakHours)
              .sort((a, b) => b[1] - a[1])[0]?.[0] + ":00" || "-"}
          </p>
        </div>

        <div className="card">
          <h3>Status</h3>
          <p>{usage === 0 ? "Idle" : "Active"}</p>
        </div>

      </div>

      {/* USAGE CARD */}

      <div className="card" style={{ marginTop: 30 }}>

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

        {percentage > 80 && (
          <p style={{ color: "#ffb020", marginTop: 10 }}>
            You are close to your limit. Consider upgrading.
          </p>
        )}

      </div>

      {/* QUICK INSIGHTS */}

      <div style={{ marginTop: 30 }} className="card">

        <h3>Quick insights</h3>

        <p>Total messages: {usage}</p>

        <p>
          Status: {usage === 0 ? "No activity yet" : "Active"}
        </p>

      </div>

      {/* UPGRADE CTA */}

      {plan === "free" && (

        <div style={{ marginTop: 30 }} className="card">

          <h3>Upgrade your plan</h3>

          <p>Unlock more messages and advanced features.</p>

          <button
            onClick={() => window.location.href = "/dashboard/billing"}
          >
            View plans
          </button>

        </div>

      )}

    </div>

  )

}