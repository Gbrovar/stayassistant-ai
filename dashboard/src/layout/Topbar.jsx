import { useApp } from "../context/AppContext"
import Button from "../components/UI/Button"

export default function Topbar({ setSidebarOpen }) {

  const { subscription, usage, conversion } = useApp()

  if (!subscription) return null

  const limits = {
    free: 100,
    pro: 1500,
    business: 5000
  }

  const plan = subscription.plan
  const limit = limits[plan] || 100

  function trackClick() {
    const variant = localStorage.getItem("sa_ab_variant")

    const events = JSON.parse(localStorage.getItem("sa_events") || "[]")

    events.push({
      type: "conversion_clicked",
      variant,
      timestamp: Date.now()
    })

    localStorage.setItem("sa_events", JSON.stringify(events))

    localStorage.setItem("sa_last_click", Date.now())
  }

  return (

    <>
      {conversion?.show && (
        <div className={`topbar-banner ${conversion.level}`}>
          <span>{conversion.message}</span>

          <Button
            variant="primary"
            onClick={() => {
              trackClick()
              window.location.href = "/dashboard/billing"
            }}
          >
            {conversion.cta || "Upgrade"}
          </Button>
        </div>
      )}

      <div className="topbar">

        <div className="topbar-left">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
          >
            ☰
          </button>

          <div className="plan-badge">
            {plan.toUpperCase()} PLAN
          </div>
        </div>

        <div className="topbar-right">

          <div className="usage-box">
            {usage} / {limit}
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              localStorage.clear()
              window.location.href = "/dashboard/login"
            }}
          >
            Logout
          </Button>

        </div>

      </div>
    </>
  )

}