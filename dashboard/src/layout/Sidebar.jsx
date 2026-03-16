import { Link } from "react-router-dom"

export default function Sidebar(){

  return(

    <aside className="sidebar">

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <Link to="/analytics">Analytics</Link>

        <Link to="/conversations">Conversations</Link>

        <Link to="/faq">FAQ</Link>

        <Link to="/preview">Widget</Link>

        <Link to="/billing">Billing</Link>

      </nav>

    </aside>

  )

}

/*
import {Link} from "react-router-dom"

export default function Sidebar(){

  return(

    <aside className="sidebar">

      <h2 className="logo">StayAssistant</h2>

      <nav>

        <Link to="/analytics">Analytics</Link>

        <Link to="/insights">Insights</Link>

        <Link to="/conversations">Conversations</Link>

        <Link to="/faq">FAQ</Link>

        <Link to="/recommendations">Recommendations</Link>

        <Link to="/branding">Branding</Link>

        <Link to="/setupwizard">Setup</Link>

        <Link to="/preview">Preview</Link>

        <Link to="/install">Install</Link>

        <Link to="/billing">Billing</Link>

        <Link to="/Onboarding">Onboarding</Link>


      </nav>

    </aside>

  )

}

*/