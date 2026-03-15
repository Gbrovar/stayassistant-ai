import {Routes,Route,Navigate,useLocation} from "react-router-dom"

import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"

import Analytics from "./pages/Analytics"
import FAQEditor from "./pages/FAQEditor"
import Install from "./pages/Install"
import Branding from "./pages/Branding"
import Recommendations from "./pages/Recommendations"
import Preview from "./pages/Preview"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Billing from "./pages/Billing"


function ProtectedLayout({children}){

  const token = localStorage.getItem("token")

  if(!token){
    return <Navigate to="/login"/>
  }

  return(

    <div className="dashboard">

      <Sidebar/>

      <div className="main">

        <Topbar/>

        <div className="content">
          {children}
        </div>

      </div>

    </div>

  )

}


export default function App(){

  return(

    <Routes>

      {/* PUBLIC ROUTES */}

      <Route path="/login" element={<Login/>}/>

      <Route path="/register" element={<Register/>}/>


      {/* PROTECTED ROUTES */}

      <Route path="/" element={<ProtectedLayout><Analytics/></ProtectedLayout>}/>

      <Route path="/analytics" element={<ProtectedLayout><Analytics/></ProtectedLayout>}/>

      <Route path="/faq" element={<ProtectedLayout><FAQEditor/></ProtectedLayout>}/>

      <Route path="/recommendations" element={<ProtectedLayout><Recommendations/></ProtectedLayout>}/>

      <Route path="/branding" element={<ProtectedLayout><Branding/></ProtectedLayout>}/>

      <Route path="/preview" element={<ProtectedLayout><Preview/></ProtectedLayout>}/>

      <Route path="/install" element={<ProtectedLayout><Install/></ProtectedLayout>}/>

      <Route path="/billing" element={<Billing />} />


      {/* FALLBACK */}

      <Route path="*" element={<Navigate to="/login"/>}/>

    </Routes>

  )

}