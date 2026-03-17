import { createContext, useContext, useEffect, useState } from "react"
import { API_URL } from "../api/config"

const AppContext = createContext()

export function AppProvider({ children }) {

  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(0)
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem("token")
  const propertyId = localStorage.getItem("propertyId")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {

    try {

      const subRes = await fetch(`${API_URL}/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const subData = await subRes.json()

      const analyticsRes = await fetch(`${API_URL}/analytics/${propertyId}/advanced`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const analyticsData = await analyticsRes.json()

      setSubscription(subData)
      setUsage(analyticsData.total_messages || 0)

    } catch (err) {
      console.error("AppContext error", err)
    }

    setLoading(false)
  }

  return (
    <AppContext.Provider value={{
      subscription,
      usage,
      loading
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}