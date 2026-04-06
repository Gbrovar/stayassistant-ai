import useOverview from "../hooks/useOverview"
import KPI from "../components/overview/KPICard"
import AlertsCard from "../components/overview/AlertsCard"
import AIStatusCard from "../components/overview/AIStatusCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"
import RevenueCard from "../components/overview/RevenueCard"
import UpgradeCard from "../components/monetization/UpgradeCard"

export default function OverviewPage() {

  const { data, loading } = useOverview()

  if (loading || !data) {
    return <div className="container">Loading...</div>
  }

  const { kpis, insights, alerts, actions, upgrade } = data

  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Dashboard</h1>
      </div>

      <div className="hero-card">
        <h2>Your AI Concierge is working</h2>

        <p>
          You've handled <strong>{kpis.messages}</strong> guest requests automatically
        </p>

        <p>
          Estimated savings: <strong>€{kpis.messages * 5}</strong>
        </p>
      </div>

      <div className="stack-lg">

        {/* KPI */}
        <div className="grid grid-4">
          <KPI label="Messages" value={kpis.messages} />
          <KPI label="Usage" value={`${Math.round(kpis.usage_pct * 100)}%`} />
          <KPI label="Revenue" value={`€${kpis.revenue}`} />
          <KPI label="Profit" value={`€${kpis.profit}`} />
        </div>

        <div className="page-content">

          <div className="grid grid-2">
            <AlertsCard data={alerts} />
            <AIStatusCard kpis={kpis} upgrade={upgrade} />
          </div>

          <OpportunitiesCard insights={insights} actions={actions} />

          <RevenueCard kpis={kpis} upgrade={upgrade} />

          {upgrade && (
            <UpgradeCard strategy={upgrade} />
          )}

        </div>

      </div>
    </div>
  )
}