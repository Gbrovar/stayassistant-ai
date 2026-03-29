import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import LockedFeature from "../components/monetization/LockedFeature"

export default function Insights() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions, setSuggestions] = useState([])
  const [expanded, setExpanded] = useState({})

  const insights = generateBusinessInsights(suggestions)

  const navigate = useNavigate()

  async function addToFAQ(question, answer) {

    await fetch(`${API_URL}/property/${propertyId}/faq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        question,
        answer
      })
    })

    navigate("/property")

  }

  useEffect(() => {

    async function load() {

      const res = await fetch(
        `${API_URL}/analytics/${propertyId}/faq-suggestions-ai`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      const data = await res.json()

      setSuggestions(data.suggestions || [])

    }

    load()

  }, [propertyId, token])

  function generateBusinessInsights(suggestions) {

    const insights = []

    const restaurants = suggestions.find(s => s.question === "restaurants")
    const activities = suggestions.find(s => s.question === "activities")

    if (restaurants && restaurants.count >= 5) {
      insights.push({
        type: "revenue",
        text: "Guests are frequently asking about restaurants. Adding recommendations will improve guest satisfaction and reduce friction."
      })
    }

    if (activities && activities.count >= 5) {
      insights.push({
        type: "experience",
        text: "Guests are looking for activities. You can enhance their stay by suggesting local experiences."
      })
    }

    if (suggestions.length === 0) {
      insights.push({
        type: "positive",
        text: "Your FAQ is well optimized. Guests are not asking repetitive questions."
      })
    }

    return insights
  }


  return (

    <div>

      <p style={{ fontSize: 13, opacity: 0.7 }}>
        This question is not covered in your FAQ.
      </p>

      {/* 🔥 AQUÍ VA BUSINESS INSIGHTS */}
      {insights.length > 0 && (
        <div className="card" style={{ marginBottom: suggestions.length ? 10 : 0 }}>

          <h3 style={{ marginBottom: 10 }}>📊 Business Insights</h3>
          <p className="muted">
            AI detected patterns in guest behavior
          </p>

          {insights.map((i, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {i.text}
            </p>
          ))}

        </div>
      )}

      {suggestions.length === 0 && (

        <div className="card">
          <p style={{ opacity: 0.7 }}>
            No suggestions yet. Your AI will generate insights once guests interact more.
          </p>
        </div>

      )}

      <div className="stack">

        {/* FREE CONTENT */}
        {suggestions.slice(0, 2).map(s => (

          <div
            className="card"
            style={{
              borderLeft: s.count >= 5
                ? "3px solid #ef4444"
                : "3px solid #22c55e"
            }}
          >
            {/* contenido igual */}
          </div>

        ))}

        {/* 🔒 LOCKED CONTENT */}
        <LockedFeature title="Unlock all AI recommendations">

          {suggestions.slice(2).map(s => (

            <div
              className="card"
              style={{
                borderLeft: s.count >= 5
                  ? "3px solid #ef4444"
                  : "3px solid #22c55e"
              }}
            >
              {/* contenido igual */}
            </div>

          ))}

        </LockedFeature>

      </div>

    </div>

  )

}