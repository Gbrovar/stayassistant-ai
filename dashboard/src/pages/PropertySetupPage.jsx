import PropertyInfo from "./PropertyInfo"
import Personalization from "./Personalization"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import LiveWidgetPreview from "../components/LiveWidgetPreview"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import { getPropertyId } from "../api/auth"

export default function PropertySetupPage() {

  const { refreshPreview } = useContext(AppContext)
  const propertyId = getPropertyId()

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">AI Concierge Setup</h1>
        <p className="page-subtitle">
          Configure your assistant and see changes instantly.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 40,
        alignItems: "start"
      }}>

        {/* LEFT */}
        <div className="stack" style={{ gap: 40 }}>

          {/* ESSENTIALS */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18 }}>Essentials</h2>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                Basic information your concierge needs to assist guests.
              </p>
            </div>

            <div className="section-content">
              <PropertyInfo />
              <div style={{ height: 20 }} />
              <Personalization />
            </div>
          </div>

          {/* KNOWLEDGE */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18 }}>Knowledge</h2>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                Define what your concierge can answer and recommend.
              </p>
            </div>

            <div className="section-content">
              <FAQEditor />
              <div style={{ height: 20 }} />
              <Recommendations />
            </div>
          </div>

          {/* APPEARANCE */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18 }}>Appearance</h2>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                Customize how your concierge looks to guests.
              </p>
            </div>

            <div className="section-content">
              <Branding />
            </div>
          </div>

        </div>

        {/* RIGHT → PREVIEW */}
        <div style={{
          position: "sticky",
          top: 20
        }}>

          <div style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 10
          }}>
            Live preview
          </div>

          <LiveWidgetPreview
            propertyId={propertyId}
            refresh={refreshPreview}
          />

        </div>

      </div>

    </div>
  )
}