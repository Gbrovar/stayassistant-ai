import { useApp } from "../../context/AppContext"

export default function UpgradeCard() {
  const { conversion } = useApp()

  const shouldShow = conversion?.show || conversion?.urgency === "high"

  if (!shouldShow) return null

  const isUrgent = conversion.urgency === "high"

  const title = isUrgent
    ? "You're reaching your limit"
    : conversion.title || "Upgrade your plan"

  const cta = isUrgent
    ? "Upgrade now"
    : conversion.cta || "Upgrade"

  return (
    <div className={`upgrade-card ${isUrgent ? "urgent" : ""}`}>

      <div className="upgrade-content">
        <h3>{title}</h3>
        <p>{conversion.message}</p>
      </div>

      <button
        className="upgrade-btn"
        onClick={() => window.location.href = "/billing"}
      >
        {cta}
      </button>

    </div>
  )
}