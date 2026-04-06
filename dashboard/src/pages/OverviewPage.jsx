import useOverview from "../hooks/useOverview"
import KPI from "../components/overview/KPICard"
import AlertsCard from "../components/overview/AlertsCard"
import AIStatusCard from "../components/overview/AIStatusCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"
import RevenueCard from "../components/overview/RevenueCard"


export default function OverviewPage() {

  const { data, loading } = useOverview()

  if (loading || !data) {
    return <div className="container">Loading...</div>
  }

  const { kpis, insights, alerts, actions, upgrade } = data

  const estimatedSavings = kpis.messages * 5

  return (
    <div className="container">


      <div className="page-header">
        <h1 className="title-lg">Your AI Performance</h1>
      </div>

      {/* HERO */}
      <div className="card hero-card">
        <h2>Your AI Concierge is handling guest requests automatically</h2>

        <p className="text-muted">
          Save time, reduce workload, and improve guest experience
        </p>

        <p>
          You've handled <strong>{kpis.messages}</strong> guest requests automatically
        </p>

        <p>
          Estimated savings: <strong>€{estimatedSavings}</strong>
        </p>

        {kpis.messages === 0 && (
          <div className="empty-state">
            <p>Start using your AI assistant to see real results</p>

            <button
              className="btn btn-primary"
              onClick={() => window.location.href = "/install"}
            >
              Activate Assistant
            </button>
          </div>
        )}
      </div>

      <div className="stack-lg">

        {/* KPI */}
        <div className="grid grid-4">
          <KPI label="AI Requests Handled" value={kpis.messages} />
          <KPI label="Usage Capacity" value={`${Math.round(kpis.usage_pct * 100)}%`} />
          <KPI label="Estimated Value" value={`€${kpis.messages * 5}`} />
          <KPI label="System Status" value={kpis.usage_pct > 0.8 ? "Near capacity" : "Running smoothly"} />
          <KPI label="Remaining Capacity" value={`${kpis.usage_limit - kpis.messages}`} />
        </div>

        <div className="page-content">

          <div className="grid grid-2">
            <AlertsCard data={alerts} />
            <AIStatusCard kpis={kpis} upgrade={upgrade} />
          </div>

          <OpportunitiesCard insights={insights} actions={actions} />

          <RevenueCard kpis={kpis} upgrade={upgrade} />

        </div>

      </div>
    </div>
  )
}