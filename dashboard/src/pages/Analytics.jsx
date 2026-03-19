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
    aiInsights
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
            <p key={idx} style={{ marginTop: 10 }}>
              {text.replace(/\*\*/g, "")}
            </p>
          ))}

        </div>
      )}

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