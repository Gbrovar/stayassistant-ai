import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"
import Analytics from "./pages/Analytics"

export default function App(){

  return(

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        <div className="content">

          <Analytics />

        </div>

      </div>

    </div>

  )

}