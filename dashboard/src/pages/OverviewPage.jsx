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
    <div className="container stack-xl">

      {/* HEADER */}
      <div className="page-header">
        <h1 className="title-lg">Your AI Performance</h1>
      </div>

      {/* HERO */}
      <div className="card-v2 card-hero">
        <h2>Your AI Concierge is working for you</h2>

        <p className="text-muted">
          Automate guest communication, save time and increase efficiency
        </p>

        <div style={{ marginTop: 16 }}>
          <strong>{kpis.messages}</strong> requests handled ·
          <strong> €{estimatedSavings}</strong> saved
        </div>

        {kpis.messages === 0 && (
          <div style={{ marginTop: 20 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = "/install"}
            >
              Activate Assistant
            </button>
          </div>
        )}
      </div>

      {/* KPI STRIP */}
      <div className="grid-dashboard">

        <div className="col-3 kpi-card">
          <div className="kpi-label">Requests</div>
          <div className="kpi-value-lg">{kpis.messages}</div>
        </div>

        <div className="col-3 kpi-card">
          <div className="kpi-label">Usage</div>
          <div className="kpi-value-lg">
            {Math.round(kpis.usage_pct * 100)}%
          </div>
        </div>

        <div className="col-3 kpi-card">
          <div className="kpi-label">Value</div>
          <div className="kpi-value-lg">
            €{kpis.messages * 5}
          </div>
        </div>

        <div className="col-3 kpi-card">
          <div className="kpi-label">Status</div>
          <div className="kpi-value-lg">
            {kpis.usage_pct > 0.8 ? "Near limit" : "Healthy"}
          </div>
        </div>

      </div>

      {/* MAIN GRID */}
      <div className="grid-dashboard">

        {/* ALERTS */}
        <div className="col-6">
          <div className="card-v2">
            <div className="section-title-v2">Alerts</div>
            <AlertsCard data={alerts} />
          </div>
        </div>

        {/* AI STATUS */}
        <div className="col-6">
          <div className="card-v2">
            <div className="section-title-v2">System</div>
            <AIStatusCard kpis={kpis} upgrade={upgrade} />
          </div>
        </div>

        {/* OPPORTUNITIES */}
        <div className="col-8">
          <div className="card-v2">
            <div className="section-title-v2">Opportunities</div>
            <OpportunitiesCard insights={insights} actions={actions} />
          </div>
        </div>

        {/* REVENUE */}
        <div className="col-4">
          <div className="card-v2">
            <div className="section-title-v2">Revenue</div>
            <RevenueCard kpis={kpis} upgrade={upgrade} />
          </div>
        </div>

      </div>

    </div>
  )

}