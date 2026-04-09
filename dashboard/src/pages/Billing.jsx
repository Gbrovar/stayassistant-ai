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

    if (!subscription || !forecast)
        return <div className="container">
            <div className="card-v2">
                <div className="text-muted">Loading billing data...</div>
            </div>
        </div>

    const usage = forecast.usage
    const limit = forecast.usage_limit
    const usageRatio = usage / limit

    return (
        <div className="container">

            <div className="grid-dashboard">

                <div className="col-12">
                    {/* HEADER */}
                    <div className="page-header">
                        <h1 className="title-lg">Billing</h1>
                        <p className="page-subtitle">
                            Manage your plan and scale your AI concierge
                        </p>
                    </div>
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

                        <button className="btn btn-md btn-primary btn-full" onClick={() => upgrade("pro")}>
                            Upgrade now
                        </button>
                    </div>
                )}

                {/* CURRENT PLAN */}
                <div className="col-8">
                    <div className="card-v2 card-hero">

                        <h3>Current Plan</h3>

                        <p className="plan-name">
                            {subscription.plan.toUpperCase()}
                        </p>


                        {subscription.status === "cancel_scheduled" && (
                            <p className="text-warning">
                                Cancels at end of billing period
                            </p>
                        )}

                        {subscription.status === "active" && (
                            <p className="status-healthy">
                                Active subscription
                            </p>
                        )}

                        <p>
                            {usage} / {limit} messages
                        </p>

                        {/* 💰 LOST VALUE */}
                        {forecast?.usage > 0 && (
                            <div className="card-soft-v2 mt-sm">
                                <p className="text-muted">Estimated value generated</p>
                                <strong>€{Math.round(forecast.usage * 5)}</strong>

                                {usageRatio > 0.7 && (
                                    <p className="text-warning mt-sm">
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
                            <p className="text-muted">
                                Renews on:{" "}
                                {new Date(billingDetails.renewal_date * 1000).toLocaleDateString()}
                            </p>
                        )}

                        {billingDetails?.next_invoice && (
                            <p className="text-muted">
                                Next invoice: €{billingDetails.next_invoice.amount.toFixed(2)} on{" "}
                                {new Date(billingDetails.next_invoice.date * 1000).toLocaleDateString()}
                            </p>
                        )}

                        <p className="text-muted">
                            Estimated this month: €{forecast.estimated_total.toFixed(2)}
                        </p>

                        <p className="text-muted">
                            Cost per message: €
                            {(forecast.cost / Math.max(usage, 1)).toFixed(4)}
                        </p>

                    </div>

                    {/* 💰 DECISION BLOCK */}
                    {usageRatio > 0.5 && (
                        <div className="card-soft-v2 mb-md">
                            <p className="text-muted">
                                Your AI is actively handling guest requests
                            </p>

                            <p className="text-muted">
                                You're already generating value. Scaling your plan will increase efficiency and guest satisfaction.
                            </p>
                        </div>
                    )}
                </div>

                {/* PORTAL */}
                <div className="col-4">
                    <div className="card-v2">

                        <h3>Manage billing</h3>

                        <div className="billing-actions">

                            <button className="btn btn-secondary btn-full"
                                onClick={openPortal}
                            >
                                Open billing portal
                            </button>

                            {subscription.plan !== "free" && subscription.status !== "cancel_scheduled" && (
                                <button className="btn btn-secondary btn-full"
                                    onClick={cancelSubscription}
                                >
                                    Cancel subscription
                                </button>
                            )}

                        </div>
                    </div>
                </div>

                {/* PLANS */}
                <div className="col-12">
                    <div className="grid-dashboard">

                        {/* PRO */}
                        <div className="plan-card recommended col-6">

                            <div className="badge">Most popular</div>

                            <h3>Pro</h3>

                            <p className="price">€39 / month</p>

                            <p className="text-muted">
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
                        <div className="plan-card col-6">

                            <h3>Business</h3>

                            <p className="price">€99 / month</p>

                            <p className="text-muted">
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
                </div>

                {/* INVOICES */}
                <div className="col-12">
                    <div className="card-v2 billing-section">

                        <h3>Invoices</h3>

                        {invoices.length === 0 ? (
                            <div className="card-soft-v2">
                                <p className="text-muted">No invoices yet</p>
                            </div>
                        ) : (
                            <div className="invoice-list">

                                {invoices.map(inv => (
                                    <div key={inv.id} className="invoice-row">

                                        <div>
                                            <strong>€{inv.amount.toFixed(2)}</strong>
                                            <p className="text-muted">
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

            </div>
        </div>
    )
}