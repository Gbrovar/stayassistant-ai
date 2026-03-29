import { useApp } from "../context/AppContext"
import { useEffect, useState } from "react"
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

  const percentage = (usage / limit) * 100

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


    <div className="topbar">

      {conversion?.show && conversion.location === "topbar" && (
        <div style={{
          background:
            conversion.level === "critical"
              ? "#7f1d1d"
              : conversion.level === "high"
                ? "#78350f"
                : "#1e3a8a",
          color: "white",
          padding: "8px 16px",
          marginBottom: 10,
          borderRadius: 6,
          fontSize: 14
        }}>
          {conversion.message}
        </div>
      )}

      {percentage > 100 && (
        <span style={{
          color: "#ef4444",
          marginRight: 8
        }}>
          ●
        </span>
      )}

      <button
        className="menu-btn"
        onClick={() => setSidebarOpen(prev => !prev)}
      >
        ☰
      </button>

      <strong>
        {plan.toUpperCase()} PLAN
      </strong>

      <div className="topbar-right">

        <div className="usage-topbar">
          {usage} / {limit}
        </div>

        {conversion?.show && conversion.location === "topbar" && (
          <Button
            variant="primary"
            style={{
              background:
                conversion.level === "critical"
                  ? "#dc2626"
                  : conversion.level === "high"
                    ? "#f59e0b"
                    : "#22c55e",
              color: "white",
              fontWeight: "bold"
            }}
            onClick={() => {
              trackClick()
              window.location.href = "/dashboard/billing"
            }}
          >
            {conversion.level === "critical"
              ? "🚨 Upgrade now"
              : conversion.level === "high"
                ? "⚡ Upgrade"
                : "Upgrade"}
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            localStorage.clear()
            window.location.href = "/login"
          }}
        >
          Logout
        </Button>

      </div>


    </div>

  )

}