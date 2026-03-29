import Insights from "./Insights"

export default function InsightsPage() {
  return (
    <div className="page">

      <div className="page-header">
        <h1 className="page-title">AI Insights</h1>
        <p className="page-subtitle">
          Improve your concierge using AI-generated suggestions
        </p>
      </div>

      <div className="stack">
        <Insights />
      </div>

    </div>
  )
}