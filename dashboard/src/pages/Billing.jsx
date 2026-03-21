import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"
import useAnalytics from "../hooks/useAnalytics"

export default function Billing() {

    const { forecast } = useApp()
    const { upgradeSignal } = useAnalytics()
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

            {usageRatio > 0.8 && usageRatio <= 1 && (
                <div style={{
                    background: "#7c2d12",
                    color: "white",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20
                }}>
                    ⚠️ You're close to your monthly limit.
                    <br />
                    Consider upgrading to avoid interruptions.
                </div>
            )}

            {usageRatio > 1 && (
                <div style={{
                    background: "#7f1d1d",
                    color: "white",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20
                }}>
                    🚀 You're exceeding your plan.
                    <br />
                    Extra usage is being billed.
                </div>
            )}

            {upgradeSignal === "upgrade_strong" && (
                <div style={{
                    marginBottom: 20,
                    padding: 16,
                    borderRadius: 10,
                    background: "#7f1d1d",
                    color: "white"
                }}>
                    🚨 You're incurring extra costs. Upgrade recommended.
                </div>
            )}

            {upgradeSignal === "upgrade_soft" && (
                <div style={{
                    marginBottom: 20,
                    padding: 16,
                    borderRadius: 10,
                    background: "#1e3a8a",
                    color: "white"
                }}>
                    ⚡ You're growing fast. Consider upgrading.
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

            {/* 💡 SOFT UPGRADE (SIEMPRE VISIBLE EN FREE) */}

            {subscription.plan === "free" && !upgradeSignal && (
                <div style={{
                    background: "#0f172a",
                    border: "1px solid #1f2937",
                    color: "#cbd5f5",
                    padding: 14,
                    borderRadius: 10,
                    marginBottom: 20
                }}>
                    💡 You're on the Free plan.
                    Upgrade to unlock more messages and advanced features.
                </div>
            )}

            {/* UPGRADE */}

            <h3 style={{ marginTop: 30 }}>Upgrade your plan</h3>

            <div className="plans">

                <div className="plan-card" style={{
                    border: upgradeSignal === "upgrade_soft" ? "2px solid #22c55e" : undefined
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
                    border: upgradeSignal === "upgrade_strong" ? "2px solid #ef4444" : undefined
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