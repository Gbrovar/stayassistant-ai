import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function Conversations() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  console.log(token)

  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {

      const res = await fetch(`${API_URL}/conversations`, {
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

    <div className="conversations-page">

      <h2>Guest Conversations</h2>

      <div className="conversations-layout">

        <div className="conversations-list">

          {conversations.map(c => (

            <div
              key={c.id}
              className="conversation-item"
              onClick={() => setSelected(c)}
            >

              <strong>Guest</strong>

              <p className="conversation-preview">
                {c.preview}
              </p>

            </div>

          ))}

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

  )

}