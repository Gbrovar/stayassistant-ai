import { useState } from "react"
import { useApp } from "../context/AppContext"
import Button from "../components/UI/Button"

export default function Topbar({ setSidebarOpen, isMobile }) {

  const { subscription, usage, conversion } = useApp()

  //if (!subscription) return null

  const limits = {
    free: 100,
    pro: 1500,
    business: 5000
  }

  const plan = subscription.plan
  const limit = limits[plan] || 100
  const [dismissed, setDismissed] = useState(
    localStorage.getItem("banner_dismissed") === "true"
  )

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
      {conversion?.show && !dismissed && (
        <div className={`topbar-banner ${conversion.level}`}>

          <span>{conversion.message}</span>

          <div className="flex gap-sm">
            <Button
              variant="primary"
              onClick={() => {
                trackClick()
                window.location.href = "/dashboard/billing"
              }}
            >
              {conversion.cta || "Upgrade"}
            </Button>

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                localStorage.setItem("banner_dismissed", "true")
                setDismissed(true)
              }}
            >
              ✕
            </button>
          </div>

        </div>
      )}

      <div className="topbar">

        <div className="topbar-left">
          {isMobile && (
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
          )}

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