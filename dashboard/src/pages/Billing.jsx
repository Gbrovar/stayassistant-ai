import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"

export default function Billing() {

    const { forecast, conversion } = useApp()
    const [subscription, setSubscription] = useState(null)
    const token = localStorage.getItem("token")

    useEffect(() => {
        loadSubscription()
    }, [])

    async function loadSubscription() {

        const res = await fetch(`${API_URL}/billing/subscription`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
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
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        const data = await res.json()

        if (!res.ok) {

            alert("You don't have an active subscription yet. Please upgrade to access billing management.")

            return
        }

        window.location.href = data.url

    }

    if (!subscription || !forecast) return <div>Loading billing...</div>

    const usage = forecast.usage
    const limit = forecast.usage_limit

    const percentage = Math.min((usage / limit) * 100, 100)
    const usageRatio = usage / limit

    return (

        <div style={{ maxWidth: 700 }}>

            <h1>Billing</h1>

            {conversion?.show && (

                <div style={{
                    background:
                        conversion.level === "critical"
                            ? "#7f1d1d"
                            : conversion.level === "high"
                                ? "#78350f"
                                : "#1e3a8a",
                    color: "white",
                    padding: 16,
                    borderRadius: 10,
                    marginBottom: 20
                }}>
                    <strong>
                        {conversion.level === "critical"
                            ? "🚨 Immediate action required"
                            : conversion.level === "high"
                                ? "⚠️ Attention needed"
                                : "💡 Opportunity"}
                    </strong>

                    <p style={{ marginTop: 6 }}>
                        {conversion.message}
                    </p>
                </div>

            )}

            {/* CURRENT PLAN */}

            <div className="card">

                <h3>Current Plan</h3>

                <p>
                    <strong>
                        {subscription.plan === "free" && "Free Plan"}
                        {subscription.plan === "pro" && "Pro Plan"}
                        {subscription.plan === "business" && "Business Plan"}
                    </strong>
                </p>

                <p>
                    {usage} / {limit} messages this month
                </p>

                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                    {usageRatio < 1
                        ? `${Math.round((1 - usageRatio) * 100)}% remaining`
                        : `Exceeded by ${Math.round((usageRatio - 1) * 100)}%`}
                </div>

                <div style={{ marginTop: 10 }}>
                    <strong>Estimated bill:</strong> €{forecast.estimated_total.toFixed(2)}
                </div>

                {forecast.overage_cost > 0 && (
                    <div style={{ color: "#f59e0b", marginTop: 5 }}>
                        +€{forecast.overage_cost.toFixed(2)} extra usage
                    </div>
                )}

                <div className="usage-bar">
                    <div
                        className="usage-fill"
                        style={{ width: `${percentage}%` }}
                    />
                </div>



            </div>

            {/* UPGRADE */}

            <h3 style={{ marginTop: 30 }}>Upgrade your plan</h3>

            <div className="plans">

                <div className="plan-card" style={{
                    border:
                        conversion?.level === "high"
                            ? "2px solid #f59e0b"
                            : conversion?.level === "critical"
                                ? "2px solid #ef4444"
                                : undefined
                }}>

                    <h4>PRO</h4>

                    <p>1500 messages / month</p>

                    <p className="price">€39 / month</p>

                    <button
                        onClick={() => upgrade("pro")}
                        style={{
                            background: "#22c55e",
                            color: "black",
                            fontWeight: "bold"
                        }}
                    >
                        🚀 Upgrade to PRO
                    </button>

                </div>

                <div className="plan-card" style={{
                    border:
                        conversion?.level === "high"
                            ? "2px solid #f59e0b"
                            : conversion?.level === "critical"
                                ? "2px solid #ef4444"
                                : undefined
                }}>

                    <h4>BUSINESS</h4>

                    <p>5000 messages / month</p>

                    <p className="price">€99 / month</p>

                    <button
                        onClick={() => upgrade("business")}
                        style={{
                            background: "#22c55e",
                            color: "black",
                            fontWeight: "bold"
                        }}
                    >
                        🚀 Upgrade to BUSINESS
                    </button>

                </div>

            </div>

            {/* BILLING PORTAL */}

            <div style={{ marginTop: 40 }}>

                <h3>Manage billing</h3>

                <button onClick={openPortal}>
                    Open billing portal
                </button>

            </div>

        </div>

    )

}