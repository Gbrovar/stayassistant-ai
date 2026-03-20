import useAdminMetrics from "../hooks/useAdminMetrics"

export default function AdminDashboard() {

  const { loading, data } = useAdminMetrics()

  if (loading) return <div>Loading...</div>

  if (!data) return <div>No data</div>

  if (!data || !data.properties) return <div>No access</div>

  return (

    <div className="page">

      <h1>Admin Dashboard</h1>

      <div className="grid">

        <div className="card">
          <h3>Total Revenue</h3>
          <p>{data.total_revenue}€</p>
        </div>

        <div className="card">
          <h3>Total Cost</h3>
          <p>{data.total_cost}€</p>
        </div>

        <div className="card">
          <h3>Total Profit</h3>
          <p>{data.total_profit}€</p>
        </div>

        <div className="card">
          <h3>Properties</h3>
          <p>{data.total_properties}</p>
        </div>

      </div>

      <h2>Properties</h2>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Plan</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Risk</th>
          </tr>
        </thead>

        <tbody>

          {data.properties.map(p => (

            <tr key={p.propertyId}>

              <td>{p.propertyId}</td>
              <td>{p.plan}</td>
              <td>{p.revenue}€</td>
              <td>{p.cost.toFixed(3)}€</td>
              <td>{p.profit.toFixed(2)}€</td>

              <td>
                {p.unprofitable ? "🔴 HIGH" :
                 p.risk === "medium" ? "🟡 MED" :
                 "🟢 LOW"}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}