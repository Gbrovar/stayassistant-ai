import Card from "../UI/Card"

export default function KPI({ label, value }) {
  return (
    <Card className="card-compact">
      <div className="text-muted">{label}</div>
      <div className="kpi-value">{value}</div>
    </Card>
  )
}