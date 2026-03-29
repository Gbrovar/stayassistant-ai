import { NavLink } from "react-router-dom"
import useAnalytics from "../hooks/useAnalytics"

export default function Sidebar({ open, setSidebarOpen }) {

  function handleClick() {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const { ltv } = useAnalytics()

  return (

    <aside className={`sidebar ${open ? "open" : ""}`}>

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
          Overview
        </NavLink>

        <NavLink to="/conversations" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Conversations
        </NavLink>

        <NavLink to="/analytics" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Analytics
        </NavLink>

        <NavLink to="/insights" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          AI Insights
        </NavLink>

        <NavLink to="/property" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Property Setup
        </NavLink>

        <NavLink to="/install" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Install
        </NavLink>

        <NavLink to="/billing" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Billing
          {ltv?.strategy && (
            <span style={{
              marginLeft: 8,
              color: ltv?.strategy?.urgency === "high"
                ? "#dc2626"
                : "#facc15"
            }}>
              ●
            </span>
          )}
        </NavLink>

        <NavLink to="/admin" onClick={handleClick} className={({ isActive }) => isActive ? "active" : ""}>
          Admin
        </NavLink>

      </nav>

    </aside>

  )

}