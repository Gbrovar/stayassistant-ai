import AIStatusCard from "../components/overview/AIStatusCard"
import RevenueCard from "../components/overview/RevenueCard"
import AlertsCard from "../components/overview/AlertsCard"
import OpportunitiesCard from "../components/overview/OpportunitiesCard"

export default function OverviewPage() {

  return (
    <div className="overview">

      <AIStatusCard />

      <div className="grid">

        <RevenueCard />
        <AlertsCard />

      </div>

      <OpportunitiesCard />

    </div>
  )
}