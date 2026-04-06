import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"

export default function Billing() {

    const { forecast, conversion } = useApp()
    const [subscription, setSubscription] = useState(null)
    const token = localStorage.getItem("token")
    const [billingDetails, setBillingDetails] = useState(null)
    const [invoices, setInvoices] = useState([])

    useEffect(() => {
        loadSubscription()
        loadBillingDetails()
        loadInvoices()
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

    async function loadBillingDetails() {

        const res = await fetch(`${API_URL}/billing/details`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()
        setBillingDetails(data)
    }

    async function loadInvoices() {

        const res = await fetch(`${API_URL}/billing/invoices`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()
        setInvoices(data)
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
        <div className="container">

            {/* HEADER */}
            <div className="page-header">
                <h1 className="title-lg">Billing</h1>
                <p className="page-subtitle">
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

                {/* 💰 LOST VALUE */}
                {forecast?.usage > 0 && (
                    <div style={{
                        marginTop: 12,
                        padding: 12,
                        background: "#1e293b",
                        borderRadius: 8
                    }}>
                        <p className="text-muted">Estimated value generated</p>
                        <strong>€{Math.round(forecast.usage * 5)}</strong>

                        {usageRatio > 0.7 && (
                            <p style={{ color: "#f59e0b", marginTop: 6 }}>
                                You could unlock significantly more value with a higher plan
                            </p>
                        )}
                    </div>
                )}

                <div className="usage-bar">
                    <div
                        className="usage-fill"
                        style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
                    />
                </div>

                {usageRatio > 0.8 && (
                    <div className="usage-alert warning">
                        ⚠️ You’re close to your limit
                    </div>
                )}

                {usageRatio >= 1 && (
                    <div className="usage-alert danger">
                        🚨 You exceeded your plan — extra charges may apply
                    </div>
                )}

                {billingDetails?.renewal_date && (
                    <p className="muted">
                        Renews on:{" "}
                        {new Date(billingDetails.renewal_date * 1000).toLocaleDateString()}
                    </p>
                )}

                {billingDetails?.next_invoice && (
                    <p className="muted">
                        Next invoice: €{billingDetails.next_invoice.amount.toFixed(2)} on{" "}
                        {new Date(billingDetails.next_invoice.date * 1000).toLocaleDateString()}
                    </p>
                )}

                <p className="muted">
                    Estimated this month: €{forecast.estimated_total.toFixed(2)}
                </p>

                <p className="muted">
                    Cost per message: €
                    {(forecast.cost / Math.max(usage, 1)).toFixed(4)}
                </p>

            </div>

            {/* 💰 DECISION BLOCK */}
            {usageRatio > 0.5 && (
                <div style={{
                    marginBottom: 20,
                    padding: 16,
                    background: "#0f172a",
                    borderRadius: 8,
                    border: "1px solid #1e293b"
                }}>
                    <p style={{ fontWeight: 600 }}>
                        Your AI is actively handling guest requests
                    </p>

                    <p className="muted">
                        You're already generating value. Scaling your plan will increase efficiency and guest satisfaction.
                    </p>
                </div>
            )}

            {/* PLANS */}
            <div className="plans">

                {/* PRO */}
                <div className="plan-card recommended">

                    <div className="badge">Most popular</div>

                    <h3>Pro</h3>

                    <p className="price">€39 / month</p>

                    <p className="muted">
                        Handle up to €{1500 * 5} in guest interactions
                    </p>

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
                        {subscription.plan === "pro" ? "Current Plan" : "Upgrade to Pro → unlock more revenue"}
                    </button>
                </div>

                {/* BUSINESS */}
                <div className="plan-card">

                    <h3>Business</h3>

                    <p className="price">€99 / month</p>

                    <p className="muted">
                        Scale up to €{5000 * 5} in guest interactions
                    </p>

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
                        {subscription.plan === "business" ? "Current Plan" : "Scale with Business plan"}
                    </button>

                </div>

            </div>

            {/* PORTAL */}
            <div className="card billing-section">

                <h3>Manage billing</h3>

                <div className="billing-actions">

                    <button
                        className="billing-portal-btn"
                        onClick={openPortal}
                    >
                        Open billing portal
                    </button>

                    {subscription.plan !== "free" && subscription.status !== "cancel_scheduled" && (
                        <button
                            className="billing-cancel-btn"
                            onClick={cancelSubscription}
                        >
                            Cancel subscription
                        </button>
                    )}

                </div>
            </div>

            <div className="card billing-section">

                <h3>Invoices</h3>

                {invoices.length === 0 ? (
                    <p className="muted">No invoices yet</p>
                ) : (
                    <div className="invoice-list">

                        {invoices.map(inv => (
                            <div key={inv.id} className="invoice-row">

                                <div>
                                    <strong>€{inv.amount.toFixed(2)}</strong>
                                    <p className="muted">
                                        {new Date(inv.date * 1000).toLocaleDateString()}
                                    </p>
                                </div>

                                <div>
                                    <span className="status">
                                        {inv.status}
                                    </span>

                                    <a
                                        href={inv.pdf}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-secondary"
                                    >
                                        Download PDF
                                    </a>
                                </div>

                            </div>
                        ))}

                    </div>
                )}

            </div>

        </div>
    )
}