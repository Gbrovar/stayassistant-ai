import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"

export default function Insights() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions, setSuggestions] = useState([])

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


  return (

    <div>

      <h2>AI Insights</h2>

      <p style={{ fontSize: 13, opacity: 0.7 }}>
        This question is not covered in your FAQ.
      </p>

      {suggestions.length === 0 && (

        <div className="analytics-card">
          No new suggestions yet.
        </div>

      )}

      {suggestions.map(s => (

        <div
          key={s.question}
          className="analytics-card"
          style={{
            borderLeft: s.count >= 5 ? "4px solid #ef4444" : "4px solid #22c55e"
          }}
        >

          <p>
            {s.count >= 5
              ? `🔥 High demand: asked ${s.count} times`
              : `Asked ${s.count} times`}
          </p>

          <h3>{s.question}</h3>

          <p className="suggested-answer">
            {s.suggested_answer}
          </p>

          <button
            className="btn btn-primary"
            onClick={() => addToFAQ(s.question, s.suggested_answer)}
          >
            Add to FAQ
          </button>

        </div>

      ))}

    </div>

  )

}