
export default function RevenueCard({ kpis, upgrade }) {

  return (
    <div className="card">
      <h3>Revenue Insights</h3>

      <div className="grid grid-2">

        <div>
          <p className="text-muted">Revenue</p>
          <strong>€{kpis.revenue}</strong>
        </div>

        <div>
          <p className="text-muted">Cost</p>
          <strong>€{kpis.cost}</strong>
        </div>

        <div>
          <p className="text-muted">Profit</p>
          <strong>€{kpis.profit}</strong>
        </div>

        <div>
          <p className="text-muted">Usage</p>
          <strong>{Math.round(kpis.usage_pct * 100)}%</strong>
        </div>

      </div>

    </div>
  )
}