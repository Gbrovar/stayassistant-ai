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

  const [autoFilling, setAutoFilling] = useState(false)

  useEffect(() => {
    async function loadProgress() {

      const token = localStorage.getItem("token")
      const propertyId = localStorage.getItem("propertyId")

      const [infoRes, faqRes, recRes] = await Promise.all([
        fetch(`${API_URL}/property/${propertyId}/property-info`, {
          headers: { Authorization: "Bearer " + token }
        }),
        fetch(`${API_URL}/property/${propertyId}/faq`, {
          headers: { Authorization: "Bearer " + token }
        }),
        fetch(`${API_URL}/property/${propertyId}/recommendations`, {
          headers: { Authorization: "Bearer " + token }
        })
      ])

      const info = await infoRes.json()
      const faq = await faqRes.json()
      const rec = await recRes.json()

      if (!info || !faq || !rec) return

      const done = {
        1: !!info?.property_info?.property_name,
        2: (faq?.faq || []).length > 0,
        3: (rec?.recommendations || []).length > 0
      }

      setStepsDone(done)

      // 🔥 si todo está completo → colapsar
      if (done[1] && done[2] && done[3]) {
        setActiveStep(null)
      }
    }

    loadProgress()
  }, [])


  const [stepsDone, setStepsDone] = useState(null)
  /*
    // 👉 lógica simple de progreso (mejoraremos luego)
    const [stepsDone, setStepsDone] = useState({
      1: false,
      2: false,
      3: false
    })
  */

  function completeStep(step) {
    setStepsDone(prev => ({ ...prev, [step]: true }))

    // 👉 avanzar automáticamente
    setActiveStep(prev => {
      if (step === 1) return 2
      if (step === 2) return 3
      return null
    })
  }

  async function handleAutoFill() {

    setAutoFilling(true)

    try {

      const token = localStorage.getItem("token")
      const propertyId = localStorage.getItem("propertyId")

      // 🔴 VALIDAR QUE HAY DIRECCIÓN REAL
      const propertyRes = await fetch(`${API_URL}/property/${propertyId}`, {
        headers: {
          "Authorization": "Bearer " + token
        }
      })

      const property = await propertyRes.json()

      if (!property?.coordinates) {
        alert("Please add your property address first to generate real local recommendations.")
        setActiveStep(1)
        return
      }

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

      // 🔥 GUARDAR EN BACKEND (FIX REAL)
      await fetch(`${API_URL}/property/${propertyId}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          recommendations: finalRecommendations
        })
      })

      // 🔥 marcar setup como completado
      setStepsDone({
        1: true,
        2: true,
        3: true
      })

      setActiveStep(null)

    } catch (err) {
      console.error("Auto-fill error", err)
    } finally {
      setAutoFilling(false)
    }
  }

  if (!stepsDone) return null

  return (
    <div className="container">

      <div className="card-v2 card-hero mb-lg">

        <div className="flex-between">

          <div>
            <h3>Quick setup with AI</h3>
            <p className="text-muted">
              Automatically generate property info, FAQs and recommendations.
            </p>
          </div>

          <button
            className="btn btn-md btn-primary"
            onClick={handleAutoFill}
            disabled={autoFilling}
          >
            {autoFilling ? "Generating..." : "✨ Auto-fill"}
          </button>

        </div>

      </div>

      <div className="setup-layout">

        <div className="setup-main stack-xl">

          <div className="section-title-v2">
            Setup steps
          </div>

          {/* STEP 1 */}
          <Section
            step="1"
            title="Basic setup"
            isDone={stepsDone[1]}
            isActive={activeStep === 1}
            onClick={() => setActiveStep(prev => prev === 1 ? null : 1)}
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
            onClick={() => setActiveStep(prev => prev === 2 ? null : 2)}
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
            onClick={() => setActiveStep(prev => prev === 3 ? null : 3)}
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