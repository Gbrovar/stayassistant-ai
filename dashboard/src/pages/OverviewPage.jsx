import AIStatusCard from "../components/overview/AIStatusCard"
import RevenueCard from "../components/overview/RevenueCard"
import AlertsCard from "../components/overview/AlertsCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"
import UpgradeCard from "../components/monetization/UpgradeCard"

export default function OverviewPage() {

  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Dashboard</h1>
      </div>

      <div className="stack-lg">

        <div className="page-content">

          <AIStatusCard />

          <div className="grid-2">
            <RevenueCard />
            <AlertsCard />
          </div>

          <OpportunitiesCard />

        </div>

      </div>
    </div>
  )
}