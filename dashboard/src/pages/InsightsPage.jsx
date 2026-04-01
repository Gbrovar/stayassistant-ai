import Insights from "./Insights"

export default function InsightsPage() {
  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">AI Insights</h1>
        <p className="page-subtitle">
          Improve your concierge using AI-generated suggestions
        </p>
      </div>

      <div className="stack-lg">
        <Insights />
      </div>

    </div>
  )
}