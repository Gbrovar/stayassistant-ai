import { useApp } from "../../context/AppContext"

export default function UpgradeCard() {
  const { conversion } = useApp()

  const shouldShow = conversion?.show || conversion?.urgency === "high"

  if (!shouldShow) return null

  const isUrgent = conversion.urgency === "high"

  return (
    <div className={`upgrade-card ${isUrgent ? "urgent" : ""}`}>

      <div className="upgrade-content">
        <h3>{conversion.title || "Upgrade your plan"}</h3>
        <p>{conversion.message}</p>
      </div>

      <button
        className="upgrade-btn"
        onClick={() => window.location.href = "/billing"}
      >
        {conversion.cta || "Upgrade now"}
      </button>

    </div>
  )
}