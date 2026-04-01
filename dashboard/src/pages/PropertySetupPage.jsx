import PropertyInfo from "./PropertyInfo"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import LiveWidgetPreview from "../components/LiveWidgetPreview"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import { getPropertyId } from "../api/auth"
import Section from "../components/UI/Section"

export default function PropertySetupPage() {

  const { refreshPreview } = useContext(AppContext)
  const propertyId = getPropertyId()

  return (
    <div className="page">

      <div className="page-header">
        <h1 className="page-title">Your AI concierge</h1>
        <p className="page-subtitle">
          Configure how your assistant works and responds to guests.
        </p>
      </div>

      <div className="page-content">

        <Section title="Essentials">
          <PropertyInfo />
        </Section>

        <Section title="Knowledge">
          <div className="knowledge-block">
            <FAQEditor />
          </div>
        </Section>

        <Section title="Knowledge">
          <div className="knowledge-block">
            <Recommendations />
          </div>
        </Section>

      </div>

      {/* Widget preview */}
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