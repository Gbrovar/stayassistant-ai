import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function Conversations() {

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {

      const res = await fetch(
        `${API_URL}/conversations/${propertyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await res.json()

      setConversations(data.conversations || [])

      setLoading(false)

    }

    load()

  }, [propertyId, token])

  if (loading) {
    return <div>Loading conversations...</div>
  }

  return (

    <div>

      <h1>Guest Conversations</h1>

      {conversations.length === 0 && (

        <p>No conversations yet.</p>

      )}

      {conversations.map(conv => (

        <div key={conv.id} className="analytics-card" style={{marginTop:20}}>

          <h3>Conversation {conv.id}</h3>

          {conv.messages.map((m, i) => (

            <div key={i} style={{marginTop:10}}>

              <strong>{m.role}</strong>: {m.content}

            </div>

          ))}

        </div>

      ))}

    </div>

  )

}