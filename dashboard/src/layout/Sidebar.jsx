import { NavLink } from "react-router-dom"
import useAnalytics from "../hooks/useAnalytics"

export default function Sidebar() {

  const { upgradeSignal } = useAnalytics()

  return (

    <aside className="sidebar">

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
          Overview
        </NavLink>

        <NavLink to="/conversations" className={({ isActive }) => isActive ? "active" : ""}>
          Conversations
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => isActive ? "active" : ""}>
          Analytics
        </NavLink>

        <NavLink to="/insights" className={({ isActive }) => isActive ? "active" : ""}>
          AI Insights
        </NavLink>

        <NavLink to="/property" className={({ isActive }) => isActive ? "active" : ""}>
          Property Setup
        </NavLink>

        <NavLink to="/install" className={({ isActive }) => isActive ? "active" : ""}>
          Install
        </NavLink>

        <NavLink to="/billing" className={({ isActive }) => isActive ? "active" : ""}>
          Billing {upgradeSignal ? "⚠️" : ""}
        </NavLink>

        <NavLink to="/admin" className={({ isActive }) => isActive ? "active" : ""}>
          Admin
        </NavLink>

      </nav>

    </aside>

  )

}