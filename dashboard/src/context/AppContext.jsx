import { createContext, useContext, useEffect, useState } from "react"
import { API_URL } from "../api/config"

const AppContext = createContext()

export function AppProvider({ children }) {

    const limits = {
        free: 100,
        pro: 1500,
        business: 5000
    }

    const [subscription, setSubscription] = useState(null)
    const [forecast, setForecast] = useState(null)
    const [usage, setUsage] = useState(0)
    const plan = subscription?.plan || "free"
    const limit = forecast?.usage_limit || limits[plan]
    const limitReached = forecast ? usage >= limit : false
    const [loading, setLoading] = useState(true)
    const token = localStorage.getItem("token")
    const propertyId = localStorage.getItem("propertyId")
    const [conversion, setConversion] = useState(null)


    function computeConversionState({
        usage,
        subscription,
        limitReached,
        ltv
    }) {

        if (!subscription) return null

        const plan = subscription.plan || "free"

        const limits = {
            free: 100,
            pro: 1500,
            business: 5000
        }

        const limit = limits[plan] || 100
        const ratio = usage / limit

        const visits = parseInt(localStorage.getItem("sa_visits") || "0")
        const lastSeen = parseInt(localStorage.getItem("sa_last_seen") || "0")

        const now = Date.now()
        const minutesSinceLastVisit = (now - lastSeen) / 1000 / 60

        let behaviorHint = ""

        if (visits >= 5 && minutesSinceLastVisit < 10) {
            behaviorHint = " You're actively managing your AI assistant."
        } else if (visits >= 3) {
            behaviorHint = " You've checked your dashboard multiple times."
        }

        const remaining = limit - usage
        let urgencyHint = ""

        if (ratio >= 0.9) {
            urgencyHint = "very soon"
        } else if (ratio >= 0.8) {
            urgencyHint = "soon"
        } else if (ratio >= 0.7) {
            urgencyHint = "in the next few days"
        }


        let pressureHint = ""

        if (ratio >= 0.9) {
            pressureHint = " Guests are actively using your concierge right now."
        } else if (ratio >= 0.7) {
            pressureHint = " Guests are actively interacting with your assistant."
        } else if (ratio >= 0.5) {
            pressureHint = " Your AI concierge is handling a good volume of guest requests."
        } else if (ratio >= 0.3) {
            pressureHint = " Your AI concierge is already helping guests."
        }

        // 🔴 HARD LIMIT
        if (limitReached || ratio >= 1) {
            return {
                show: true,
                level: "critical",
                type: "limit",
                message: `You've reached your monthly limit. Your AI concierge may stop responding to guests right now.${pressureHint}${behaviorHint}`,
                cta: "Upgrade to keep it running",
                location: "topbar"
            }
        }

        // 🟠 HIGH USAGE
        if (ratio >= 0.8) {
            return {
                show: true,
                level: "high",
                type: "usage",
                message: remaining < 200
                    ? `Only ${remaining} messages left — at this pace you may hit your limit ${urgencyHint}.${pressureHint}${behaviorHint}`
                    : `You're using your AI actively. At this pace you may hit your limit ${urgencyHint}.${pressureHint}${behaviorHint}`,
                cta: "Upgrade before interruptions",
                location: "topbar"
            }
        }

        // ⚡ LTV
        if (ltv?.strategy) {
            return {
                show: true,
                level: "medium",
                type: "ltv",
                message: `${ltv.strategy.message} Upgrading now helps you capture more guest interactions.${behaviorHint}`,
                cta: "Unlock more capacity",
                location: "overview"
            }
        }

        // 💡 FREE ENGAGEMENT
        if (plan === "free" && usage > 20) {
            return {
                show: true,
                level: "low",
                type: "engagement",
                message: "Your AI concierge is already helping guests. Upgrade to handle more requests and improve their experience.",
                cta: "Upgrade for more capacity",
                location: "overview"
            }
        }

        return null
    }

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {

        const forecastRes = await fetch(`${API_URL}/billing/forecast/${propertyId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        const forecastData = await forecastRes.json()

        try {

            const subRes = await fetch(`${API_URL}/billing/subscription`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const subData = await subRes.json()

            setSubscription(subData)
            setUsage(forecastData.usage || 0)
            setForecast(forecastData)

            const usageValue = forecastData.usage || 0
            const limitValue = forecastData.usage_limit || limits[subData.plan || "free"]
            const limitReachedValue = usageValue >= limitValue

            const conversionState = computeConversionState({
                usage: usageValue,
                subscription: subData,
                limitReached: limitReachedValue,
                ltv: forecastData?.ltv || null
            })

            setConversion(conversionState)


        } catch (err) {
            console.error("AppContext error", err)
        }

        setLoading(false)
    }

    return (
        <AppContext.Provider value={{
            subscription,
            usage,
            forecast, // 🔥 NEW
            loading,
            limit,
            limitReached,
            conversion
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}