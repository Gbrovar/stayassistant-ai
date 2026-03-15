import { useEffect, useState } from "react"

export default function Billing() {

  const [subscription, setSubscription] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  const token = localStorage.getItem("token")
  const propertyId = localStorage.getItem("propertyId")

  useEffect(() => {

    loadSubscription()
    loadUsage()

  }, [])

  async function loadSubscription() {

    const res = await fetch(
      `http://localhost:3000/billing/subscription`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    setSubscription(data)

  }

  async function loadUsage() {

    const res = await fetch(
      `http://localhost:3000/analytics/${propertyId}/advanced`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    setAnalytics(data)

  }

  async function upgrade(plan) {

    //const res = await fetch(`${API_URL}/analytics/${propertyId}/advanced`, {
    const res = await fetch(
      `http://localhost:3000/billing/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      }
    )

    const data = await res.json()

    window.location.href = data.url

  }

  if (!subscription || !analytics) return <div>Loading...</div>

  return (

    <div>

      <h2>Billing</h2>

      <p>
        <strong>Current Plan:</strong> {subscription.plan}
      </p>

      <p>
        <strong>Status:</strong> {subscription.status}
      </p>

      <p>
        <strong>Messages this month:</strong> {analytics.total_messages}
      </p>

      <hr/>

      <h3>Upgrade</h3>

      <button onClick={() => upgrade("pro")}>
        Upgrade to PRO
      </button>

      <button onClick={() => upgrade("business")}>
        Upgrade to Business
      </button>

    </div>

  )

}