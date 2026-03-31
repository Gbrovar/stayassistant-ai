import useAnalytics from "../../hooks/useAnalytics"

export default function RevenueCard() {
  const { ltv, plan, totalMessages } = useAnalytics()

  if (!ltv || typeof ltv !== "object") return null

  const score =
    typeof ltv.score === "number"
      ? ltv.score.toFixed(2)
      : "-"

  return (
    <div className="card">
      <h3>Revenue Insights</h3>

      <div className="grid-2">
        <div>
          <p>Plan</p>
          <strong>{plan || "-"}</strong>
        </div>

        <div>
          <p>Messages</p>
          <strong>{totalMessages ?? "-"}</strong>
        </div>

        <div>
          <p>Score</p>
          <strong>{score}</strong>
        </div>

        <div>
          <p>Strategy</p>
          <strong>{ltv.strategy?.type || "-"}</strong>
        </div>
      </div>
    </div>
  )
}