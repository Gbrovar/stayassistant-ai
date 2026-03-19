import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import useAnalytics from "../hooks/useAnalytics"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Analytics() {

  const {
    loading,
    totalMessages,
    topIntents,
    peakHours,
    hasData,
    insights,
    aiInsights,
    semanticInsights,
    conversationScore,
    alerts
  } = useAnalytics()

  /* --- PREPARE CHART DATA --- */

  const intentData = topIntents.map(i => ({
    name: i.intent,
    value: i.count
  }))

  const hourData = Object.keys(peakHours).map(h => ({
    hour: h,
    messages: Number(peakHours[h])
  }))

  if (loading) {

    return (
      <div>
        <h1>Analytics</h1>
        <p>Loading analytics...</p>
      </div>
    )

  }

  if (!hasData) {

    return (
      <div>
        <h2>Analytics</h2>

        <div className="analytics-card">
          Analytics will appear once guests start using the assistant.
        </div>

      </div>
    )

  }

  return (

    <div>

      <h2>Analytics</h2>

      {alerts.length > 0 && (
        <div style={{ marginTop: 20 }}>

          {alerts.map((a, idx) => (

            <div
              key={idx}
              style={{
                background: a.level === "critical" ? "#7f1d1d" : "#78350f",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10
              }}
            >
              ⚠️ {a.text}
            </div>

          ))}

        </div>
      )}

      {insights.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>📊 Business Insights</h3>

          {insights.map((i, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {i.text}
            </p>
          ))}

        </div>
      )}

      {aiInsights.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>🤖 AI Insights</h3>

          {aiInsights.map((text, idx) => (

            <div key={idx} style={{ marginTop: 15 }}>

              <p>{text.replace(/\*\*/g, "")}</p>

              {text.toLowerCase().includes("restaurant") && (
                <button
                  style={{ marginTop: 5 }}
                  onClick={async () => {

                    const propertyId = localStorage.getItem("propertyId")
                    const token = localStorage.getItem("token")

                    await fetch(`${API_URL}/analytics/${propertyId}/apply-action`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        action: "add_restaurant_faq"
                      })
                    })

                    window.location.reload()

                  }}
                >
                  Add restaurant FAQ
                </button>
              )}

            </div>

          ))}

        </div>
      )}

      {semanticInsights.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>🧠 Conversation Insights</h3>

          {semanticInsights.map((text, idx) => (
            <div key={idx} style={{ marginTop: 15 }}>
              <p>{text.replace(/\*\*/g, "")}</p>
            </div>
          ))}

        </div>
      )}

      {conversationScore && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>📊 Conversation Quality</h3>

          <p>Clarity: {conversationScore.clarity?.toFixed(1)} / 10</p>
          <p>Satisfaction: {conversationScore.satisfaction?.toFixed(1)} / 10</p>
          <p>Friction: {conversationScore.friction?.toFixed(1)} / 10</p>

        </div>
      )}

      <button
        style={{ marginTop: 10 }}
        onClick={async () => {

          const propertyId = localStorage.getItem("propertyId")
          const token = localStorage.getItem("token")

          const res = await fetch(
            `${API_URL}/analytics/${propertyId}/auto-optimize`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )

          const data = await res.json()

          alert("Optimizations applied 🚀")
          window.location.reload()

        }}
      >
        ⚡ Auto Optimize Property
      </button>

      {/* TOTAL MESSAGES */}

      <div style={{ marginTop: 30 }}>

        <h3>Total messages</h3>

        <div className="analytics-card">

          {totalMessages}

        </div>

      </div>


      {/* TOP INTENTS */}

      <div style={{ marginTop: 50 }}>

        <h3>Top guest requests</h3>

        <div style={{ width: "100%", height: 300 }}>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={intentData}>

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="value"
                fill="#22c55e"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>


      {/* PEAK HOURS */}

      <div style={{ marginTop: 50 }}>

        <h3>Peak hours</h3>

        <div style={{ width: "100%", height: 300 }}>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={hourData}>

              <XAxis dataKey="hour" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="messages"
                fill="#3b82f6"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>

  )

}