import Analytics from "./Analytics"

export default function AnalyticsPage() {
  return (
    <div className="page">

      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Understand guest behavior and assistant performance
        </p>
      </div>

      <div className="stack">
        <Analytics />
      </div>

    </div>
  )
}