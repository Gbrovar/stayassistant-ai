import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import LockedFeature from "../components/monetization/LockedFeature"

export default function Insights() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  const navigate = useNavigate()

  async function addToFAQ(question, answer) {

  try {

    // 1. Obtener FAQ actual
    const res = await fetch(`${API_URL}/property/${propertyId}/faq`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const data = await res.json()
    const currentFaq = data.faq || []

    // 2. Evitar duplicados
    const exists = currentFaq.some(f => f.question === question)

    if (exists) {
      alert("This FAQ already exists")
      return
    }

    // 3. Crear nuevo array
    const updatedFaq = [
      ...currentFaq,
      { question, answer }
    ]

    // 4. Guardar TODO el array
    await fetch(`${API_URL}/property/${propertyId}/faq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ faq: updatedFaq })
    })

    // 5. UX feedback
    navigate("/property")

  } catch (err) {
    console.error(err)
    alert("Error adding FAQ")
  }
}

  useEffect(() => {
    async function load() {
      setLoading(true)

      const res = await fetch(
        `${API_URL}/analytics/${propertyId}/faq-suggestions-ai`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setLoading(false)
    }

    load()
  }, [propertyId, token])

  function toggleExpand(index) {
    setExpanded(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

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

  const insights = generateBusinessInsights(suggestions)

  if (loading) {
    return (
      <div className="card">
        <p>Analyzing guest conversations...</p>
      </div>
    )
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
          <p>
            Your AI is learning from guest interactions.
            Insights will appear as soon as enough data is collected.
          </p>
        </div>
      )}

      {/* FREE */}
      {suggestions.slice(0, 2).map((s, idx) => {

        const isExpanded = expanded[idx]
        const text = s.suggested_answer
        const shortText = text.slice(0, 200)

        return (
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
              {isExpanded ? text : shortText + "..."}
            </p>

            {text.length > 200 && (
              <button
                className="btn-link"
                onClick={() => toggleExpand(idx)}
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            )}

            <button
              className="btn-primary btn-full"
              onClick={() => addToFAQ(s.question, s.suggested_answer)}
            >
              Add to FAQ
            </button>
          </div>
        )
      })}

      {/* LOCKED */}
      <LockedFeature title="Unlock all AI recommendations">
        {suggestions.slice(2).map((s, idx) => (
          <div key={s.question + idx} className="card">
            <h3>{s.question}</h3>
            <p>{s.suggested_answer}</p>
          </div>
        ))}
      </LockedFeature>

    </div>
  )
}