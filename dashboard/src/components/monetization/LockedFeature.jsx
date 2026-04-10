import { useApp } from "../../context/AppContext"
import Button from "../UI/Button"

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

        <Button
          variant="primary"
          size="md"
          onClick={() => window.location.href = "/billing"}
        >
          Upgrade to Pro
        </Button>
      </div>

    </div>
  )
}