import { useEffect, useState } from "react"
import Card from "../components/Card"
import StatItem from "../components/StatItem"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"

export default function Analytics() {

  const [stats, setStats] = useState([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [peakHours, setPeakHours] = useState({})
  const [loading, setLoading] = useState(true)

  const propertyId = getPropertyId()

  useEffect(() => {

    async function load() {

      const res = await fetch(`${API_URL}/analytics/${propertyId}/advanced`, {

        headers: {
          "Authorization": "Bearer " + getToken()
        }

      })

      const data = await res.json()

      setStats(data.top_intents || [])
      setTotalMessages(data.total_messages || 0)
      setPeakHours(data.peak_hours || {})

      setLoading(false)
    }

    load()

  }, [])

  if (!loading && totalMessages === 0) {

    return (

      <div>

        <h1>Analytics</h1>

        <Card>

          <p style={{ opacity: 0.8 }}>

            Analytics will appear once guests start using the assistant.

          </p>

        </Card>

      </div>

    )

  }

  return (

    <div>

      <h1>Analytics</h1>

      <Card>
        <StatItem
          label="Total Messages"
          value={totalMessages}
        />
      </Card>

      <Card>

        {stats.map(item => (

          <StatItem
            key={item.intent}
            label={item.intent}
            value={item.count}
          />

        ))}

      </Card>

      <Card>

        <h3>Peak Hours</h3>

        {Object.entries(peakHours).map(([hour, count]) => (

          <StatItem
            key={hour}
            label={`${hour}:00`}
            value={count}
          />

        ))}

      </Card>

    </div>

  )

}