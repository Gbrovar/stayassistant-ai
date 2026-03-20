import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"

export default function Topbar() {


  const { subscription, usage } = useApp()
  const { upgradeSignal } = useAnalytics()

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

      <strong>
        {plan.toUpperCase()} PLAN {upgradeSignal ? "⚡" : plan === "free" ? "💡" : ""}
      </strong>

      <div className="topbar-right">

        <div className="usage-topbar">
          {usage} / {limit}
        </div>

        <button
          style={{
            background: upgradeSignal ? "#f59e0b" : undefined,
            fontWeight: upgradeSignal ? "bold" : "normal"
          }}
          onClick={() => window.location.href = "/billing"}
        >
          {upgradeSignal ? "Upgrade Recommended" : "Upgrade"}
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

      {percentage > 90 && (
        <div className="topbar-warning">
          You are about to reach your limit
        </div>
      )}

      {percentage >= 100 && (
        <div className="topbar-danger">
          Limit reached — upgrade required
        </div>
      )}

    </div>

  )

}