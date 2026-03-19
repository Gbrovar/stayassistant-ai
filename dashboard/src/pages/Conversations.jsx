import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import { useApp } from "../context/AppContext"

export default function Conversations() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const { limitReached } = useApp()


  function analyzeConversation(messages) {
    const userMessages = messages.filter(m => m.role === "user")
    const aiMessages = messages.filter(m => m.role === "assistant")

    const lastUser = userMessages.slice(-1)[0]?.content?.toLowerCase() || ""

    let intent = "other"

    if (lastUser.includes("eat") || lastUser.includes("comer"))
      intent = "restaurants"

    if (lastUser.includes("taxi"))
      intent = "transport"

    if (lastUser.includes("wifi"))
      intent = "wifi"

    const fallback = aiMessages.some(m =>
      m.content.includes("I'm not sure") ||
      m.content.includes("Could you rephrase")
    )

    return {
      messagesCount: messages.length,
      intent,
      fallback
    }
  }

  useEffect(() => {

    async function load() {

      const res = await fetch(`${API_URL}/conversations/${propertyId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      setConversations(data.conversations || [])
      setLoading(false)

    }

    load()

  }, [propertyId, token])


  if (loading) {
    return <div>Loading conversations...</div>
  }

  if (conversations.length === 0) {
    return (
      <div>
        <h2>Guest Conversations</h2>

        <div className="analytics-card">
          No guest conversations yet.
        </div>
      </div>
    )
  }

  return (

    <>

      {limitReached && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Usage limit reached</h3>
          <p>You have reached your monthly limit.</p>

          <button onClick={() => window.location.href = "/billing"}>
            Upgrade plan
          </button>
        </div>
      )}

      <div className="conversations-page">

        <h2>Guest Conversations</h2>

        <div className="conversations-layout">

          <div className="conversations-list">

            {conversations.map(c => {

              const analysis = analyzeConversation(c.messages)

              return (

                <div
                  key={c.id}
                  className="conversation-item"
                  style={{ opacity: limitReached ? 0.5 : 1 }}  // 👈 AQUÍ VA
                  onClick={() => !limitReached && setSelected(c)}
                >

                  <strong>Guest</strong>

                  <p className="conversation-preview">
                    {c.preview}
                  </p>

                  <div className="conversation-meta">
                    <span>Intent: {analysis.intent}</span>
                    <span>{analysis.messagesCount} msgs</span>

                    {analysis.fallback && (
                      <span style={{ color: "orange" }}>⚠ fallback</span>
                    )}
                  </div>

                </div>

              )
            })
            }

          </div>

          <div className="conversation-detail">

            {!selected && <p>Select a conversation</p>}

            {selected && (

              <div>

                <h3>Conversation {selected.id}</h3>

                {selected.messages.map((m, i) => (

                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "message-user"
                        : "message-ai"
                    }
                  >

                    <strong>{m.role}</strong>

                    <p>{m.content}</p>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

    </>
  )

}