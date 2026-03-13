import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"

import Analytics from "./pages/Analytics"
import FAQEditor from "./pages/FAQEditor"
import Install from "./pages/Install"
import Branding from "./pages/Branding"

import {Routes,Route} from "react-router-dom"

export default function App(){

  return(

    <div className="dashboard">

      <Sidebar/>

      <div className="main">

        <Topbar/>

        <div className="content">

          <Routes>

            <Route path="/" element={<Analytics/>}/>

            <Route path="/analytics" element={<Analytics/>}/>

            <Route path="/faq" element={<FAQEditor/>}/>

            <Route path="/branding" element={<Branding/>}/>

            <Route path="/install" element={<Install/>}/>

          </Routes>

        </div>

      </div>

    </div>

  )

}