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
    hasData
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