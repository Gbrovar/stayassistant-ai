import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"
import { useEffect, useState } from "react"

export default function Topbar() {


  const { subscription, usage } = useApp()
  const [realtimeUpgrade, setRealtimeUpgrade] = useState(null)
  const { upgradeSignal, ltv } = useAnalytics()

  useEffect(() => {

    try {

      const raw = localStorage.getItem("stayassistant_upgrade_signal")

      if (!raw) return

      const data = JSON.parse(raw)

      const isRecent = Date.now() - data.timestamp < 1000 * 60 * 10 // 10 min

      if (isRecent) {
        setRealtimeUpgrade(data)
      }

    } catch (e) {
      console.log("Upgrade signal read error")
    }

  }, [])

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

      {realtimeUpgrade && (

        <div style={{
          background: "#7f1d1d",
          color: "white",
          padding: "8px 16px",
          marginBottom: 10,
          borderRadius: 6,
          fontSize: 14
        }}>
          🚨 High usage detected in real time. Upgrade recommended.
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
              realtimeUpgrade?.urgency === "high"
                ? "#dc2626"
                : ltv?.strategy?.urgency === "high"
                  ? "#dc2626"
                  : "#22c55e",
            color: "white",
            fontWeight: "bold"
          }}
          onClick={() => window.location.href = "/dashboard/billing"}
        >
          {realtimeUpgrade?.urgency === "high"
            ? "🚨 Upgrade Now"
            : realtimeUpgrade
              ? "⚡ Upgrade (Live)"
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