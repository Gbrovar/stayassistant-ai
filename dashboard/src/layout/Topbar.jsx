import { useApp } from "../context/AppContext"

export default function Topbar() {

  const { subscription, usage } = useApp()

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

      <div className="topbar-left">
        <strong>{plan.toUpperCase()} PLAN</strong>
      </div>

      <div className="topbar-right">

        <div className="usage-topbar">
          {usage} / {limit}
        </div>

        <button onClick={() => window.location.href = "/billing"}>
          Upgrade
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