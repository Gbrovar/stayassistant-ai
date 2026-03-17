import { Routes, Route, Navigate, useLocation } from "react-router-dom"

import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"


import Install from "./pages/Install"
import Branding from "./pages/Branding"

import Preview from "./pages/Preview"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Billing from "./pages/Billing"
import Onboarding from "./pages/Onboarding"
import Conversations from "./pages/Conversations"
import Insights from "./pages/Insights"
import Recommendations from "./pages/Recommendations"
import Analytics from "./pages/Analytics"
import FAQEditor from "./pages/FAQEditor"

import Property from "./pages/Property"
import ConversationsPage from "./pages/ConversationsPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import InsightsPage from "./pages/InsightsPage"
import PropertySetupPage from "./pages/PropertySetupPage"
import OverviewPage from "./pages/OverviewPage"


function ProtectedLayout({ children }) {

  const token = localStorage.getItem("token")

  if (!token) {
    return <Navigate to="/login" />
  }

  return (

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        <div className="content">
          {children}
        </div>

      </div>

    </div>

  )

}


export default function App() {

  return (

    <Routes>

      {/* PUBLIC ROUTES */}

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />


      {/* PROTECTED ROUTES */}

      <Route path="/" element={<ProtectedLayout><OverviewPage /></ProtectedLayout>} />



      <Route path="/branding" element={<ProtectedLayout><Branding /></ProtectedLayout>} />



      <Route path="/preview" element={<ProtectedLayout><Preview /></ProtectedLayout>} />

      <Route path="/install" element={<ProtectedLayout><Install /></ProtectedLayout>} />

      <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />

      <Route path="/onboarding" element={<ProtectedLayout><Onboarding /></ProtectedLayout>} />

 

      <Route path="/propertyOld" element={<ProtectedLayout><Property /></ProtectedLayout>} />




      <Route path="/conversations" element={<ProtectedLayout><ConversationsPage /></ProtectedLayout>} />
      <Route path="/analytics" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
      <Route path="/insights" element={<ProtectedLayout><InsightsPage /></ProtectedLayout>} />
      <Route path="/property" element={<ProtectedLayout><PropertySetupPage /></ProtectedLayout>} />

      {/* FALLBACK */}

      <Route path="*" element={<Navigate to="/analytics" />} />

    </Routes>

  )

}