import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"

export default function Billing() {

    const { usage } = useApp()

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

    if (!subscription) return <div>Loading...</div>

    const limits = {
        free: 100,
        pro: 1500,
        business: 5000
    }

    const limit = limits[subscription.plan] || 100
    // usage viene del contexto

    const percentage = Math.min((usage / limit) * 100, 100)

    return (

        <div style={{ maxWidth: 700 }}>

            <h1>Billing</h1>

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

                <div className="plan-card">

                    <h4>PRO</h4>

                    <p>1500 messages / month</p>

                    <p className="price">€39 / month</p>

                    <button onClick={() => upgrade("pro")}>
                        Upgrade
                    </button>

                </div>

                <div className="plan-card">

                    <h4>BUSINESS</h4>

                    <p>5000 messages / month</p>

                    <p className="price">€99 / month</p>

                    <button onClick={() => upgrade("business")}>
                        Upgrade
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