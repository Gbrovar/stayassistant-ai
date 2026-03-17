import { Link } from "react-router-dom"

export default function Sidebar() {

  return (

    <aside className="sidebar">

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <Link to="/">Overview</Link>

        <Link to="/conversations">Conversations</Link>

        <Link to="/analytics">Analytics</Link>

        <Link to="/insights">AI Insights</Link>

        <Link to="/property">Property Setup</Link>

        <Link to="/install">Install</Link>

        <Link to="/billing">Billing</Link>

      </nav>

    </aside>

  )

}