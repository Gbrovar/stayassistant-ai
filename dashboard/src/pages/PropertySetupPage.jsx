import PropertyInfo from "./PropertyInfo"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import { useContext, useState, useEffect } from "react"
import { AppContext } from "../context/AppContext"
import Section from "../components/UI/Section"

export default function PropertySetupPage() {

  const { refreshPreview } = useContext(AppContext)

  const [activeStep, setActiveStep] = useState(1)

  // 👉 lógica simple de progreso (mejoraremos luego)
  const [stepsDone, setStepsDone] = useState({
    1: false,
    2: false,
    3: false
  })

  function completeStep(step) {
    setStepsDone(prev => ({ ...prev, [step]: true }))

    // avanzar automáticamente
    if (step < 3) {
      setActiveStep(step + 1)
    }
  }

  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Your AI concierge</h1>
        <p className="page-subtitle">
          Configure how your assistant works and responds to guests.
        </p>
      </div>

      <div className="setup-layout">

        <div className="setup-main stack-lg">

          {/* STEP 1 */}
          <Section
            step="1"
            title="Basic setup"
            isDone={stepsDone[1]}
            isActive={activeStep === 1}
            onClick={() => setActiveStep(1)}
          >
            {activeStep === 1 && (
              <PropertyInfo onComplete={() => completeStep(1)} />
            )}
          </Section>

          {/* STEP 2 */}
          <Section
            step="2"
            title="Train your AI"
            isDone={stepsDone[2]}
            isActive={activeStep === 2}
            onClick={() => setActiveStep(2)}
          >
            {activeStep === 2 && (
              <FAQEditor onComplete={() => completeStep(2)} />
            )}
          </Section>

          {/* STEP 3 */}
          <Section
            step="3"
            title="Recommendations"
            isDone={stepsDone[3]}
            isActive={activeStep === 3}
            onClick={() => setActiveStep(3)}
          >
            {activeStep === 3 && (
              <Recommendations onComplete={() => completeStep(3)} />
            )}
          </Section>

        </div>

      </div>

    </div>
  )
}