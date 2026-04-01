import AIStatusCard from "../components/overview/AIStatusCard"
import RevenueCard from "../components/overview/RevenueCard"
import AlertsCard from "../components/overview/AlertsCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"
import UpgradeCard from "../components/monetization/UpgradeCard"
import KPI from "../components/overview/KPICard"

export default function OverviewPage() {

  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Dashboard</h1>
      </div>

      <div className="stack-lg">

        <div className="grid grid-4">
          <KPI label="Messages" value="--" />
          <KPI label="Top Intent" value="--" />
          <KPI label="Peak Hour" value="--" />
          <KPI label="Status" value="--" />
        </div>

        <div className="page-content">

          <div className="grid grid-2">
            <AlertsCard />
            <AIStatusCard />
          </div>

          <OpportunitiesCard />

          <RevenueCard />

        </div>

      </div>
    </div>
  )
}