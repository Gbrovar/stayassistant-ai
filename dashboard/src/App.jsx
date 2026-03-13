import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"

import Install from "./pages/Install"

export default function App(){

  return(

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        <div className="content">

          <Install />

        </div>

      </div>

    </div>

  )

}