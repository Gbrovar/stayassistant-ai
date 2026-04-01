import Analytics from "./Analytics"

export default function AnalyticsPage() {
  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Analytics</h1>
        <p className="page-subtitle">
          Understand guest behavior and assistant performance
        </p>
      </div>

      <div className="stack-lg">
        <Analytics />
      </div>

    </div>
  )
}