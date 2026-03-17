import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function OverviewPage() {

  const [subscription, setSubscription] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  const token = localStorage.getItem("token")
  const propertyId = localStorage.getItem("propertyId")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {

    const subRes = await fetch(`${API_URL}/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const subData = await subRes.json()

    const analyticsRes = await fetch(`${API_URL}/analytics/${propertyId}/advanced`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const analyticsData = await analyticsRes.json()

    setSubscription(subData)
    setAnalytics(analyticsData)
  }

  if (!subscription || !analytics) return <div>Loading dashboard...</div>

  const limits = {
    free: 100,
    pro: 1500,
    business: 5000
  }

  const plan = subscription.plan || "free"
  const limit = limits[plan]
  const usage = analytics.total_messages || 0

  const percentage = Math.min((usage / limit) * 100, 100)

  return (

    <div>

      <h1>Dashboard</h1>

      <p>Overview of your AI concierge performance.</p>

      {/* USAGE CARD */}

      <div className="card" style={{ marginTop: 30 }}>

        <h3>Your usage</h3>

        <p>
          <strong>{usage}</strong> / {limit} messages this month
        </p>

        <div className="usage-bar">
          <div
            className="usage-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {percentage > 80 && (
          <p style={{ color: "#ffb020", marginTop: 10 }}>
            You are close to your limit. Consider upgrading.
          </p>
        )}

      </div>

      {/* QUICK INSIGHTS */}

      <div style={{ marginTop: 30 }} className="card">

        <h3>Quick insights</h3>

        <p>Total messages: {usage}</p>

        <p>
          Status: {usage === 0 ? "No activity yet" : "Active"}
        </p>

      </div>

      {/* UPGRADE CTA */}

      {plan === "free" && (

        <div style={{ marginTop: 30 }} className="card">

          <h3>Upgrade your plan</h3>

          <p>Unlock more messages and advanced features.</p>

          <button
            onClick={() => window.location.href = "/dashboard/billing"}
          >
            View plans
          </button>

        </div>

      )}

    </div>

  )

}