import Conversations from "./Conversations"

export default function ConversationsPage() {
  return (
  <div className="container">
    <div className="page-header">
      <h2 className="title-lg">Guest Conversations</h2>
      <p className="page-subtitle">
        Monitor how your AI concierge interacts with guests
      </p>
    </div>

    <div className="stack-lg">
      <Conversations />
    </div>

  </div>
  )

}

