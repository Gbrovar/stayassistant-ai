import { useEffect, useState } from "react"
import Conversations from "./Conversations"
import { API_URL } from "../api/config"
import { getToken, getPropertyId } from "../api/auth"

export default function ConversationsPage() {

  const [conversations, setConversations] = useState(null)

  useEffect(() => {

    async function load() {

      const res = await fetch(`${API_URL}/conversations/${getPropertyId()}`, {
        headers: {
          "Authorization": "Bearer " + getToken()
        }
      })

      const data = await res.json()

      setConversations(data.conversations || [])

    }

    load()

  }, [])

  if (conversations === null) {
    return <div>Loading conversations...</div>
  }

  if (conversations.length === 0) {
    return (
      <div className="page">
        <h1>Conversations</h1>

        <div className="card" style={{ marginTop: 30 }}>
          No conversations yet.
          <br /><br />
          Guests will appear here once they start chatting.
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Conversations</h1>

      <div style={{ marginTop: 30 }}>
        <Conversations />
      </div>
    </div>
  )
}