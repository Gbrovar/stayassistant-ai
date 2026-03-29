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

        {/* ONBOARDING CHECKLIST */}

        {(!ltv || usage === 0) && (

          <div className="card">

            <div style={{ fontWeight: 600, marginBottom: 10 }}>
              🚀 Get started
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* STEP 1 */}
              <div className="onboarding-step"
                onClick={() => window.location.href = "/dashboard/property"}
              >
                {ltv ? "✅" : "⬜"} Setup your property
              </div>

              {/* STEP 2 */}
              <div className="onboarding-step"
                onClick={() => window.location.href = "/dashboard/install"}
              >
                ⬜ Install the widget
              </div>

              {/* STEP 3 */}
              <div>
                {usage > 0 ? "✅" : "⬜"} Receive your first message
              </div>

            </div>

          </div>

        )}

        {conversion?.show && conversion.location === "overview" && (


          <div
            className="card"
            style={{
              border: "1px solid rgba(34,197,94,0.4)",
              background: "linear-gradient(180deg, #0f1b2b, #0b1220)"
            }}
          >

            <h3 style={{ marginBottom: 8 }}>
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
                Upgrade plan →
              </Button>
            </div>

          </div>

        )}

        <div className="kpis">

          <div className="card">
            <div style={{ fontSize: 13, opacity: 0.6 }}>Messages</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
              {totalMessages}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, opacity: 0.6 }}>Top Request</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
              {topIntents[0]?.intent || "-"}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, opacity: 0.6 }}>Peak Hour</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
              {peak}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, opacity: 0.6 }}>Status</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
              {usage === 0 ? "Idle" : "Active"}
            </div>
          </div>

        </div>

        {/* USAGE CARD */}

        <div className="card">

          <div style={{ fontSize: 14, opacity: 0.7 }}>Your usage</div>

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

          <div style={{ fontSize: 14, opacity: 0.7 }}>Quick insights</div>

          <p>Total messages: {usage}</p>

          <p style={{ marginTop: 6, opacity: 0.7 }}>
            {usage < 10
              ? "Start using your assistant to unlock insights"
              : "Your assistant is actively helping guests"}
          </p>

          <p>
            Status: {usage === 0 ? "No activity yet" : "Active"}
          </p>

        </div>

      </div>
    </div>

  )

}