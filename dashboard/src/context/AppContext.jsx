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
            limitReached
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}