import useAnalytics from "../../hooks/useAnalytics"

export default function RevenueCard() {
  const { ltv, plan, totalMessages } = useAnalytics()

  if (!ltv) return null

  return (
    <div className="card">
      <h3>Revenue Insights</h3>

      <div className="grid-2">
        <div>
          <p>Plan</p>
          <strong>{plan}</strong>
        </div>

        <div>
          <p>Messages</p>
          <strong>{totalMessages}</strong>
        </div>

        <div>
          <p>Score</p>
          <strong>{ltv.score?.toFixed(2)}</strong>
        </div>

        <div>
          <p>Strategy</p>
          <strong>{ltv.strategy?.type}</strong>
        </div>
      </div>
    </div>
  )
}