import { Link } from "react-router-dom"

export default function Sidebar(){

  return(

    <aside className="sidebar">

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <Link to="/analytics">Analytics</Link>

        <Link to="/guide">Guide</Link>

        <Link to="/property">Property</Link>

        <Link to="/assistant">Assistant</Link>

        <Link to="/install">Install</Link>

        <Link to="/billing">Billing</Link>

      </nav>

    </aside>

  )

}