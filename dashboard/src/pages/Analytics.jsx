import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Analytics() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [loading, setLoading] = useState(true)

  const [totalMessages, setTotalMessages] = useState(0)
  const [topIntents, setTopIntents] = useState([])
  const [peakHours, setPeakHours] = useState({})
  const [hasData, setHasData] = useState(false)

  useEffect(() => {

    async function loadAnalytics() {

      try {

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

      } catch (err) {

        console.error("Analytics load error:", err)

      }

      setLoading(false)

    }

    loadAnalytics()

  }, [propertyId, token])

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

          <ResponsiveContainer>

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

          <ResponsiveContainer>

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