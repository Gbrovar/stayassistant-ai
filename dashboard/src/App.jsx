import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"

export default function App() {

  return (

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        <div className="content">

          <h1>Dashboard</h1>

        </div>

      </div>

    </div>

  )

}