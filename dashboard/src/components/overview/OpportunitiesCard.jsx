import useAnalytics from "../../hooks/useAnalytics"

export default function OpportunitiesCard() {
  const { insights } = useAnalytics()

  async function applyAction(action) {
    const token = localStorage.getItem("token")
    const propertyId = localStorage.getItem("propertyId")

    await fetch(`/analytics/${propertyId}/apply-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    })

    window.location.reload()
  }

  if (!insights.length) return null

  return (
    <div className="card">
      <h3>AI Opportunities</h3>

      {insights.map((i, index) => (
        <div key={index} className="card-soft">

          <p>{i.text}</p>

          {i.type === "revenue" && (
            <button className="btn btn-primary" onClick={() => applyAction("add_restaurant_faq")}>
              Add recommendation FAQ
            </button>
          )}

          {i.type === "experience" && (
            <button className="btn btn-primary" onClick={() => applyAction("add_activities_faq")}>
              Add activities FAQ
            </button>
          )}

        </div>
      ))}
    </div>
  )
}