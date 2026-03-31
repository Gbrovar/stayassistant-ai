import PropertyInfo from "./PropertyInfo"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import LiveWidgetPreview from "../components/LiveWidgetPreview"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import { getPropertyId } from "../api/auth"

export default function PropertySetupPage() {

  const { refreshPreview } = useContext(AppContext)
  const propertyId = getPropertyId()

  return (
    <div className="page">

      {/* CONTENIDO CENTRADO */}
      <div style={{
        maxWidth: 820,
        margin: "0 auto"
      }}>

        {/* HEADER */}
        <div className="page-header" style={{ marginBottom: 32 }}>
          <h1 className="page-title">Your AI concierge</h1>
          <p className="page-subtitle">
            Configure how your assistant works and responds to guests.
          </p>
        </div>

        {/* CONTENT */}
        <div className="stack" style={{ gap: 56 }}>

          {/* ESSENTIALS */}
          <div style={sectionWrapper}>
            <SectionHeader
              title="Essentials"
              subtitle="Add the key details your guests usually ask for."
            />

            <div className="section-content">
              <PropertyInfo />
              <div style={{ height: 32 }} />
            </div>
          </div>

          {/* KNOWLEDGE */}
          <div style={sectionWrapper}>
            <SectionHeader
              title="Knowledge"
              subtitle="Teach your concierge what guests ask most often."
            />

            <div className="section-content">
              <FAQEditor />
              <div style={{ height: 32 }} />
              <Recommendations />
            </div>
          </div>


        </div>

      </div>

      {/* 🔥 WIDGET FLOTANTE */}
      <div style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 340,
        zIndex: 100
      }}>
        <LiveWidgetPreview
          propertyId={propertyId}
          refresh={refreshPreview}
        />
      </div>

    </div>
  )
}

/* 🔥 COMPONENTE HEADER (REUTILIZABLE) */
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{
        fontSize: 20,
        fontWeight: 600,
        marginBottom: 4
      }}>
        {title}
      </h2>

      <p style={{
        fontSize: 13,
        color: "#94a3b8"
      }}>
        {subtitle}
      </p>
    </div>
  )
}

/* 🔥 WRAPPER VISUAL (CLAVE UX) */
const sectionWrapper = {
  padding: "28px",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.02)"
}