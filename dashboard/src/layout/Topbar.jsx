import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"

export default function Topbar() {


  const { subscription, usage } = useApp()
  const { upgradeSignal, ltv } = useAnalytics()

  if (!subscription) return null

  const limits = {
    free: 100,
    pro: 1500,
    business: 5000
  }

  const plan = subscription.plan
  const limit = limits[plan] || 100

  const percentage = (usage / limit) * 100

  return (

    <div className="topbar">

      {percentage > 100 && (
        <span style={{
          color: "#ef4444",
          marginRight: 8
        }}>
          ●
        </span>
      )}

      <strong>
        {plan.toUpperCase()} PLAN {ltv?.strategy ? "⚡" : plan === "free" ? "💡" : ""}
      </strong>

      <div className="topbar-right">

        <div className="usage-topbar">
          {usage} / {limit}
        </div>

        <button
          style={{
            background:
              upgradeSignal === "upgrade_strong"
                ? "#dc2626"
                : "#22c55e",
            color: "white",
            fontWeight: "bold"
          }}
          onClick={() => window.location.href = "/dashboard/billing"}
        >
          {ltv?.strategy?.urgency === "high"
            ? "🚨 Upgrade Now"
            : ltv?.strategy
              ? "⚡ Upgrade"
              : "Upgrade"}
        </button>

        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = "/login"
          }}
        >
          Logout
        </button>

      </div>

      {/* WARNING BAR */}

      {percentage > 80 && percentage <= 100 && (
        <div className="topbar-warning">
          ⚠️ High usage — nearing limit
        </div>
      )}

      {percentage > 100 && (
        <div className="topbar-danger">
          🚨 Over limit — extra costs active
        </div>
      )}

    </div>

  )

}