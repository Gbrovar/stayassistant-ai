import PropertyInfo from "./PropertyInfo"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import { useContext, useState, useEffect } from "react"
import { AppContext } from "../context/AppContext"
import Section from "../components/UI/Section"
import { API_URL } from "../api/config"

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
  }

  async function handleAutoFill() {
    try {

      const token = localStorage.getItem("token")
      const propertyId = localStorage.getItem("propertyId")

      // 🧠 0. ENSURE SETUP FIRST (CRÍTICO)
      await fetch(`${API_URL}/property/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({})
      })

      // 1️⃣ AI DATA
      const res = await fetch(`${API_URL}/ai/setup-generator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        }
      })

      const aiData = await res.json()

      // 2️⃣ GOOGLE PLACES (MULTI CATEGORY 🔥)
      const types = ["restaurants", "cafes", "attractions"]

      const placesResults = await Promise.all(
        types.map(type =>
          fetch(`${API_URL}/property/${propertyId}/places/${type}`)
            .then(r => r.json())
            .catch(() => ({ items: [] }))
        )
      )

      // 3️⃣ NORMALIZE PLACES
      const realPlaces = placesResults.flatMap(res =>
        (res.items || []).slice(0, 5).map(p => ({
          name: p.name,
          description: `${p.address || ""} • ⭐ ${p.rating || "N/A"}`
        }))
      )

      // 4️⃣ DEDUPE SYSTEM 🔥
      function dedupe(list) {
        const seen = new Set()
        return list.filter(item => {
          const key = item.name.toLowerCase().trim()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }

      // 5️⃣ MERGE INTELIGENTE
      const finalRecommendations = dedupe([
        ...(aiData.recommendations || []),
        ...realPlaces
      ]).slice(0, 12)

      // 6️⃣ FINAL DATA
      const finalData = {
        ...aiData,
        recommendations: finalRecommendations
      }

      // 7️⃣ DISPATCH
      window.dispatchEvent(new CustomEvent("ai-autofill", {
        detail: finalData
      }))

    } catch (err) {
      console.error("Auto-fill error", err)
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

      <div style={{ marginBottom: 20 }}>

        <button
          className="btn btn-primary"
          onClick={handleAutoFill}
        >
          ✨ Auto-fill with AI
        </button>

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