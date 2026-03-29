import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import LockedFeature from "../components/monetization/LockedFeature"

export default function Insights() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions, setSuggestions] = useState([])
  const navigate = useNavigate()

  const insights = generateBusinessInsights(suggestions)

  async function addToFAQ(question, answer) {
    await fetch(`${API_URL}/property/${propertyId}/faq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ question, answer })
    })

    navigate("/property")
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `${API_URL}/analytics/${propertyId}/faq-suggestions-ai`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        text: "Guests frequently ask about restaurants. Add recommendations to improve satisfaction."
      })
    }

    if (activities && activities.count >= 5) {
      insights.push({
        text: "Guests look for activities. Suggest experiences to improve their stay."
      })
    }

    if (suggestions.length === 0) {
      insights.push({
        text: "Your FAQ is well optimized. No repeated questions detected."
      })
    }

    return insights
  }

  return (
    <div className="stack">

      {/* BUSINESS INSIGHTS */}
      {insights.length > 0 && (
        <div className="card">
          <h3>📊 Business Insights</h3>

          {insights.map((i, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {i.text}
            </p>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {suggestions.length === 0 && (
        <div className="card">
          <p>No suggestions yet. AI will generate insights soon.</p>
        </div>
      )}

      {/* FREE */}
      {suggestions.slice(0, 2).map((s, idx) => (
        <div
          key={s.question + idx}
          className="card"
          style={{
            borderLeft: s.count >= 5
              ? "2px solid #ef4444"
              : "2px solid #22c55e"
          }}
        >
          <p style={{ fontSize: 12, marginBottom: 6 }}>
            {s.count >= 5
              ? `🔥 High demand — ${s.count}`
              : `${s.count} requests`}
          </p>

          <h3>{s.question}</h3>

          <p className="suggested-answer">
            {s.suggested_answer}
          </p>

          <button
            className="btn-primary btn-full"
            onClick={() => addToFAQ(s.question, s.suggested_answer)}
          >
            Add to FAQ
          </button>
        </div>
      ))}

      {/* LOCKED */}
      <LockedFeature title="Unlock all AI recommendations">
        {suggestions.slice(2).map((s, idx) => (
          <div
            key={s.question + idx}
            className="card"
          >
            <h3>{s.question}</h3>
            <p>{s.suggested_answer}</p>
          </div>
        ))}
      </LockedFeature>

    </div>
  )
}