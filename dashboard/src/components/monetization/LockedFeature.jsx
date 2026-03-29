import { useApp } from "../../context/AppContext"

export default function LockedFeature({ children, title = "Upgrade required" }) {
  const { subscription } = useApp()

  const isPro = subscription?.plan !== "free"

  if (isPro) return children

  return (
    <div className="locked-wrapper">

      <div className="locked-content">
        {children}
      </div>

      <div className="locked-overlay">
        <h3>{title}</h3>
        <p>Unlock advanced insights and optimization tools</p>

        <button onClick={() => window.location.href = "/billing"}>
          Upgrade to Pro
        </button>
      </div>

    </div>
  )
}