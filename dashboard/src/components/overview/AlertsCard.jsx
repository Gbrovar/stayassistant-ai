
export default function AlertsCard({ data }) {

  if (!data || !data.length) return null

  return (
    <div className="card">
      <h3>Alerts</h3>

      {data.map((a, i) => (
        <div key={i} className="alert">
          {a.text}
        </div>
      ))}
    </div>
  )
}