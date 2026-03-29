import AIStatusCard from "../components/overview/AIStatusCard"
import RevenueCard from "../components/overview/RevenueCard"
import AlertsCard from "../components/overview/AlertsCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"
import UpgradeCard from "../components/monetization/UpgradeCard"

export default function OverviewPage() {

  return (
    <div className="overview">

      <UpgradeCard />

      <AIStatusCard />

      <div className="grid">

        <RevenueCard />
        <AlertsCard />

      </div>

      <OpportunitiesCard />

    </div>
  )
}