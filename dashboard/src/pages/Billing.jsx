import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"

export default function Billing() {

  const { forecast, conversion } = useApp()
  const [subscription, setSubscription] = useState(null)
  const token = localStorage.getItem("token")

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {

    const res = await fetch(`${API_URL}/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = await res.json()
    setSubscription(data)
  }

  async function upgrade(plan) {

    const res = await fetch(`${API_URL}/billing/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ plan })
    })

    const data = await res.json()
    window.location.href = data.url
  }

  async function openPortal() {

    const res = await fetch(`${API_URL}/billing/portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = await res.json()

    if (!res.ok) {
      alert("Upgrade first to access billing management")
      return
    }

    window.location.href = data.url
  }

  if (!subscription || !forecast) return <div>Loading billing...</div>

  const usage = forecast.usage
  const limit = forecast.usage_limit
  const usageRatio = usage / limit

  return (
    <div className="billing">

      {/* HEADER */}
      <div className="page-header">
        <h1>Billing</h1>
        <p className="muted">
          Manage your plan and scale your AI concierge
        </p>
      </div>

      {/* CONVERSION ALERT */}
      {conversion?.show && (
        <div className={`upgrade-card ${conversion.level === "critical" ? "urgent" : ""}`}>
          <div>
            <strong>
              {conversion.level === "critical"
                ? "🚨 Limit reached"
                : "⚡ Growing usage"}
            </strong>

            <p>{conversion.message}</p>
          </div>

          <button className="upgrade-btn" onClick={() => upgrade("pro")}>
            Upgrade now
          </button>
        </div>
      )}

      {/* CURRENT PLAN */}
      <div className="card">

        <h3>Current Plan</h3>

        <p className="plan-name">
          {subscription.plan.toUpperCase()}
        </p>

        <p>
          {usage} / {limit} messages
        </p>

        <div className="usage-bar">
          <div
            className="usage-fill"
            style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
          />
        </div>

        <p className="muted">
          Estimated this month: €{forecast.estimated_total.toFixed(2)}
        </p>

      </div>

      {/* PLANS */}
      <div className="plans">

        {/* PRO */}
        <div className="plan-card recommended">

          <div className="badge">Most popular</div>

          <h3>Pro</h3>

          <p className="price">€39 / month</p>

          <ul>
            <li>✓ 1500 messages</li>
            <li>✓ AI insights</li>
            <li>✓ Analytics</li>
          </ul>

          <button className="btn-primary" onClick={() => upgrade("pro")}>
            Upgrade to Pro
          </button>

        </div>

        {/* BUSINESS */}
        <div className="plan-card">

          <h3>Business</h3>

          <p className="price">€99 / month</p>

          <ul>
            <li>✓ 5000 messages</li>
            <li>✓ Advanced analytics</li>
            <li>✓ Priority processing</li>
          </ul>

          <button className="btn-primary" onClick={() => upgrade("business")}>
            Upgrade to Business
          </button>

        </div>

      </div>

      {/* PORTAL */}
      <div className="card" style={{ marginTop: 30 }}>

        <h3>Manage billing</h3>

        <button onClick={openPortal}>
          Open billing portal
        </button>

      </div>

    </div>
  )
}