import SetupWizard from "./SetupWizard"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import Personalization from "./Personalization"

export default function PropertySetupPage() {

  return (

    <div>

      <h1>Property Setup</h1>
      <p>Configure your AI concierge step by step.</p>

      {/* STEP 1 — PROPERTY BASICS */}

      <section style={{ marginTop: 40 }}>
        <h2>1. Property Information</h2>
        <SetupWizard />
      </section>

      {/* STEP 2 — FAQ */}

      <section style={{ marginTop: 60 }}>
        <h2>2. FAQ</h2>
        <FAQEditor />
      </section>

      {/* STEP 3 — RECOMMENDATIONS */}

      <section style={{ marginTop: 60 }}>
        <h2>3. Local Recommendations</h2>
        <Recommendations />
      </section>

      {/* STEP 4 — ASSISTANT */}

      <section style={{ marginTop: 60 }}>
        <h2>4. Assistant Settings</h2>
        <Personalization />
      </section>

      {/* STEP 5 — BRANDING */}

      <section style={{ marginTop: 60 }}>
        <h2>5. Widget Branding</h2>
        <Branding />
      </section>

    </div>

  )

}