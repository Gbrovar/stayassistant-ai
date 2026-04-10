import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { useApp } from "./context/AppContext"
import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"
import Install from "./pages/Install"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Billing from "./pages/Billing"
import ConversationsPage from "./pages/ConversationsPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import InsightsPage from "./pages/InsightsPage"
import PropertySetupPage from "./pages/PropertySetupPage"
import OverviewPage from "./pages/OverviewPage"
import AdminDashboard from "./pages/AdminDashboard"
import BillingSuccess from "./pages/BillingSuccess"
import useResponsive from "./hooks/useResponsive"



function ProtectedLayout({ children }) {

  const location = useLocation()

  const { limitReached } = useApp()

  const token = localStorage.getItem("token")

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { isMobile } = useResponsive()

  const [refreshPreview, setRefreshPreview] = useState(0)

  if (!token) {
    return <Navigate to="/login" />
  }

  useEffect(() => {

    const visits = parseInt(localStorage.getItem("sa_visits") || "0")
    localStorage.setItem("sa_visits", visits + 1)

    localStorage.setItem("sa_last_seen", Date.now())

  }, [location.pathname])

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen, isMobile])

  return (

    <div className="dashboard">

      <Sidebar
        open={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />


      <div className={`main ${isMobile && sidebarOpen ? "blur" : ""}`}>

        <Topbar
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />

        
        {limitReached && (
          <div style={{
            background: "#ff3b30",
            color: "white",
            padding: "10px",
            textAlign: "center",
            fontWeight: "bold"
          }}>
            Usage limit reached — upgrade your plan
          </div>
        )}

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
      <Route path="/install" element={<ProtectedLayout><Install /></ProtectedLayout>} />
      <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
      <Route path="/conversations" element={<ProtectedLayout><ConversationsPage /></ProtectedLayout>} />
      <Route path="/analytics" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
      <Route path="/insights" element={<ProtectedLayout><InsightsPage /></ProtectedLayout>} />
      <Route path="/property" element={<ProtectedLayout><PropertySetupPage /></ProtectedLayout>} />

      <Route path="/billing/success" element={<BillingSuccess />} />

      <Route path="/admin" element={<AdminDashboard />} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>

  )

}