import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function useAnalytics() {

    const propertyId = localStorage.getItem("propertyId")
    const token = localStorage.getItem("token")
    const [loading, setLoading] = useState(true)
    const [totalMessages, setTotalMessages] = useState(0)
    const [topIntents, setTopIntents] = useState([])
    const [peakHours, setPeakHours] = useState({})
    const [hasData, setHasData] = useState(false)
    const [insights, setInsights] = useState([])
    const [aiInsights, setAiInsights] = useState([])
    const [semanticInsights, setSemanticInsights] = useState([])
    const [conversationScore, setConversationScore] = useState(null)
    const [alerts, setAlerts] = useState([])
    const [upgradeSignal, setUpgradeSignal] = useState(null)

    const [plan, setPlan] = useState("free")

    useEffect(() => {

        async function loadAnalytics() {

            try {

                const resSub = await fetch(`${API_URL}/billing/subscription`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const subData = await resSub.json()

                setPlan(subData.plan || "free")

                const res = await fetch(
                    `${API_URL}/analytics/${propertyId}/advanced`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const data = await res.json()

                setTotalMessages(data.total_messages || 0)
                setTopIntents(data.top_intents || [])
                setPeakHours(data.peak_hours || {})
                setHasData(data.has_data || false)

                const resInsights = await fetch(
                    `${API_URL}/analytics/${propertyId}/business`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dataInsights = await resInsights.json()

                setInsights(dataInsights.insights || [])

                const resAI = await fetch(
                    `${API_URL}/analytics/${propertyId}/ai-insights`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dataAI = await resAI.json()

                setAiInsights(dataAI.insights || [])

                const resSemantic = await fetch(
                    `${API_URL}/analytics/${propertyId}/semantic-insights`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dataSemantic = await resSemantic.json()

                setSemanticInsights(dataSemantic.insights || [])

                const resScore = await fetch(
                    `${API_URL}/analytics/${propertyId}/conversation-score`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dataScore = await resScore.json()

                setConversationScore(dataScore)

                const resAlerts = await fetch(
                    `${API_URL}/analytics/${propertyId}/alerts`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                const dataAlerts = await resAlerts.json()

                setAlerts(dataAlerts.alerts || [])

            } catch (err) {

                console.error("Analytics load error:", err)

            }

            const resUpgrade = await fetch(
                `${API_URL}/analytics/${propertyId}/upgrade-signal`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const dataUpgrade = await resUpgrade.json()

            setUpgradeSignal(dataUpgrade.upgradeSignal)

            setLoading(false)

        }

        loadAnalytics()

        const interval = setInterval(() => {
            loadAnalytics()
        }, 15000) // cada 15s

        return () => clearInterval(interval)

    }, [propertyId, token])

    return {
        plan,
        loading,
        totalMessages,
        topIntents,
        peakHours,
        hasData,
        insights,
        aiInsights,
        semanticInsights,
        conversationScore,
        alerts,
        upgradeSignal
    }

}