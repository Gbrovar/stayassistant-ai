import Conversations from "./Conversations"

export default function ConversationsPage() {
  return (
    <div>
      <h1>Conversations</h1>
      <p>View and manage guest conversations.</p>

      <div style={{ marginTop: 30 }}>
        <Conversations />
      </div>
    </div>
  )
}