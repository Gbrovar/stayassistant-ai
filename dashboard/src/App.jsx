import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AppProvider } from "./context/AppContext"
import { useApp } from "./context/AppContext"

import Sidebar from "./layout/Sidebar"
import Topbar from "./layout/Topbar"


import Install from "./pages/Install"
import Branding from "./pages/Branding"

import Preview from "./pages/Preview"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Billing from "./pages/Billing"
import Onboarding from "./pages/_legacy/Onboarding"

import Property from "./pages/_legacy/Property"
import ConversationsPage from "./pages/ConversationsPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import InsightsPage from "./pages/InsightsPage"
import PropertySetupPage from "./pages/PropertySetupPage"
import OverviewPage from "./pages/OverviewPage"
import AdminDashboard from "./pages/AdminDashboard"


function ProtectedLayout({ children }) {
  const location = useLocation()
  const { limitReached } = useApp()

  const token = localStorage.getItem("token")

  if (!token) {
    return <Navigate to="/login" />
  }

  useEffect(() => {

    const visits = parseInt(localStorage.getItem("sa_visits") || "0")
    localStorage.setItem("sa_visits", visits + 1)

    localStorage.setItem("sa_last_seen", Date.now())

  }, [location.pathname])

  return (

    <div className="dashboard">

      <Sidebar />

      <div className="main">

        <Topbar />

        {/* ✅ AQUÍ VA EL BLOQUE */}
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

    <AppProvider>
      <Routes>

        {/* PUBLIC ROUTES */}

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />


        {/* PROTECTED ROUTES */}

        <Route path="/" element={<ProtectedLayout><OverviewPage /></ProtectedLayout>} />

        <Route path="/branding" element={<ProtectedLayout><Branding /></ProtectedLayout>} />
        <Route path="/install" element={<ProtectedLayout><Install /></ProtectedLayout>} />
        <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
        <Route path="/conversations" element={<ProtectedLayout><ConversationsPage /></ProtectedLayout>} />
        <Route path="/analytics" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
        <Route path="/insights" element={<ProtectedLayout><InsightsPage /></ProtectedLayout>} />
        <Route path="/property" element={<ProtectedLayout><PropertySetupPage /></ProtectedLayout>} />

        <Route path="/admin" element={<AdminDashboard />} />

        {/* FALLBACK */}

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </AppProvider>

  )

}