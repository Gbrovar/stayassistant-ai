
export default function OpportunitiesCard({ insights, actions }) {

  if (!insights?.length && !actions?.length) return null

  return (
    <div className="card">
      <h3>AI Opportunities</h3>

      {insights?.map((text, i) => (
        <div key={i} className="card card-soft">
          <p>{text}</p>
        </div>
      ))}

      {actions?.map((a, i) => (
        <div key={i} className="card card-soft">

          <p>{a.text}</p>

          <button
            className="btn btn-secondary"
            onClick={() => window.location.href = "/property-setup"}
          >
            Fix this
          </button>

        </div>
      ))}

    </div>
  )
}