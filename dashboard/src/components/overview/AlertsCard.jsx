import useAnalytics from "../../hooks/useAnalytics"

export default function AlertsCard() {
  const { alerts } = useAnalytics()

  if (!alerts.length) return null

  return (
    <div className="card">
      <h3>Alerts</h3>

      {alerts.map((a, i) => (
        <div key={i} className={`alert ${a.level}`}>
          {a.text}
        </div>
      ))}
    </div>
  )
}