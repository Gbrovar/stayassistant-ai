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

  const safeUsage = usage || 0
  const safeLimit = limit || 1

  const percentage = (safeUsage / safeLimit) * 100

  const isUrgent = conversion?.level === "critical"

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

      {/* 🔥 GLOBAL UPGRADE BANNER */}
      {conversion?.show && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              conversion.level === "critical"
                ? "#7f1d1d"
                : conversion.level === "high"
                  ? "#78350f"
                  : "#1e3a8a",
            color: "white",
            padding: "10px 16px",
            marginBottom: 10,
            borderRadius: 8,
            fontSize: 14,
            animation: isUrgent ? "pulse 1.5s infinite" : "none"
          }}
        >

          <span style={{ fontWeight: 500 }}>
            {conversion.message}
          </span>

          <Button
            variant="primary"
            style={{
              marginLeft: 16,
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
            {isUrgent
              ? "🚨 Upgrade now"
              : conversion.cta || "Upgrade"}
          </Button>

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

  )

}