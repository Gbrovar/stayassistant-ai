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

    useEffect(() => {
        loadSubscription()

        const params = new URLSearchParams(window.location.search)

        if (params.get("billing") === "success") {
            loadSubscription()
        }

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

    async function cancelSubscription() {

        const confirmCancel = confirm("Are you sure you want to cancel your subscription?")

        if (!confirmCancel) return

        const res = await fetch(`${API_URL}/billing/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()

        if (res.ok) {
            alert("Subscription will be cancelled at the end of billing period")
            loadSubscription()
        } else {
            alert(data.error || "Cancel failed")
        }
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

                {subscription.status === "cancel_scheduled" && (
                    <p style={{ color: "#f59e0b" }}>
                        Cancels at end of billing period
                    </p>
                )}

                {subscription.status === "active" && (
                    <p style={{ color: "#22c55e" }}>
                        Active subscription
                    </p>
                )}

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

                    <button
                        className={`btn-primary ${subscription.plan === "pro" ? "btn-disabled" : ""}`}
                        onClick={() => upgrade("pro")}
                        disabled={subscription.plan === "pro"}
                    >
                        {subscription.plan === "pro" ? "Current Plan" : "Upgrade to Pro"}
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

                    <button
                        className={`btn-primary ${subscription.plan === "business" ? "btn-disabled" : ""}`}
                        onClick={() => upgrade("business")}
                        disabled={subscription.plan === "business"}
                    >
                        {subscription.plan === "business" ? "Current Plan" : "Upgrade to Business"}
                    </button>

                </div>

            </div>

            {/* PORTAL */}
            <div className="card" style={{ marginTop: 30 }}>

                <h3>Manage billing</h3>

                <button onClick={openPortal}>
                    Open billing portal
                </button>

                {subscription.plan !== "free" && subscription.status !== "cancel_scheduled" && (
                    <button
                        onClick={cancelSubscription}
                        style={{
                            marginTop: 10,
                            background: "#ef4444",
                            color: "white"
                        }}
                    >
                        Cancel subscription
                    </button>
                )}

            </div>

        </div>
    )
}