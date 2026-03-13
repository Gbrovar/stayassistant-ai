import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"

import FAQEditor from "./pages/FAQEditor"

export default function App(){

  return(

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        <div className="content">

          <FAQEditor />

        </div>

      </div>

    </div>

  )

}