import PropertyInfo from "./PropertyInfo"
import Personalization from "./Personalization"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"

export default function PropertySetupPage() {

  return (
    <div className="page">

      {/* WRAPPER CENTRADO */}
      <div style={{
        maxWidth: 820,
        margin: "0 auto"
      }}>

        {/* HEADER */}
        <div className="page-header">
          <h1 className="page-title">Your AI concierge</h1>
          <p className="page-subtitle">
            Configure how your assistant works and responds to guests.
          </p>
        </div>

        {/* CONTENT */}
        <div className="stack" style={{ gap: 48 }}>

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
              <div style={{ height: 24 }} />
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
              <div style={{ height: 24 }} />
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

      </div>

    </div>
  )
}