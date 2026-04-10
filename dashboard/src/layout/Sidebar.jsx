import { NavLink } from "react-router-dom"
import useAnalytics from "../hooks/useAnalytics"
import useResponsive from "../hooks/useResponsive"
import { useApp } from "../context/AppContext"

export default function Sidebar({ open, setSidebarOpen }) {

  const { conversion } = useApp()
  const { isMobile } = useResponsive()

  function handleClick() {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (

    <aside className={`sidebar ${open ? "open" : ""}`}>

      <h2 className="logo">StayAssistant</h2>

      <nav>

        {[
          { to: "/", label: "Overview" },
          { to: "/conversations", label: "Conversations" },
          { to: "/analytics", label: "Analytics" },
          { to: "/insights", label: "AI Insights" },
          { to: "/property", label: "Property Setup" },
          { to: "/install", label: "Install" },
          { to: "/billing", label: "Billing", hasDot: true },
          { to: "/admin", label: "Admin" }
        ].map((item) => (

          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleClick}
            className={({ isActive }) => isActive ? "active" : ""}
          >
            <span className="sidebar-label">{item.label}</span>

            {item.hasDot && conversion?.show && conversion?.level !== "low" && (
              <span className={`sidebar-dot ${conversion?.level}`} />
            )}

          </NavLink>

        ))}

      </nav>

    </aside>

  )
}