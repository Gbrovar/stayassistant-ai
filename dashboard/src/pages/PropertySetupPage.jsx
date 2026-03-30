import { useState, useContext } from "react"
import PropertyInfo from "./PropertyInfo"
import Personalization from "./Personalization"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import LiveWidgetPreview from "../components/LiveWidgetPreview"
import { AppContext } from "../context/AppContext"
import { getPropertyId } from "../api/auth"

const STEPS = [
  {
    id: 0,
    title: "Your property",
    subtitle: "Basic info your concierge needs",
    component: <PropertyInfo />
  },
  {
    id: 1,
    title: "Your assistant",
    subtitle: "Define how it talks and behaves",
    component: <Personalization />
  },
  {
    id: 2,
    title: "What it can answer",
    subtitle: "Teach your concierge what matters",
    component: (
      <>
        <FAQEditor />
        <Recommendations />
      </>
    )
  },
  {
    id: 3,
    title: "Look & feel",
    subtitle: "Customize branding and appearance",
    component: <Branding />
  }
]

export default function PropertySetupPage() {

  const [step, setStep] = useState(0)
  const { refreshPreview } = useContext(AppContext)
  const propertyId = getPropertyId()

  const current = STEPS[step]

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function back() {
    if (step > 0) {
      setStep(step - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">Setup your AI concierge</h1>
        <p className="page-subtitle">
          Create and customize your assistant in a few steps.
        </p>
      </div>

      {/* PROGRESS */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 30
      }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            height: 6,
            borderRadius: 4,
            background: i <= step
              ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
              : "rgba(255,255,255,0.1)"
          }} />
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 40,
        alignItems: "start"
      }}>

        {/* LEFT SIDE */}
        <div>

          {/* STEP HEADER */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 6
            }}>
              Step {step + 1} of {STEPS.length}
            </div>

            <h2 style={{
              fontSize: 22,
              marginBottom: 6
            }}>
              {current.title}
            </h2>

            <p style={{
              color: "#94a3b8",
              fontSize: 14
            }}>
              {current.subtitle}
            </p>
          </div>

          {/* CONTENT */}
          <div className="section-content">
            {current.component}
          </div>

          {/* ACTIONS */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24
          }}>

            <button
              className="btn btn-secondary"
              onClick={back}
              disabled={step === 0}
              style={{ opacity: step === 0 ? 0.3 : 1 }}
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                Continue →
              </button>
            ) : (
              <button className="btn btn-primary">
                Finish setup
              </button>
            )}

          </div>

        </div>

        {/* RIGHT SIDE → PREVIEW */}
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