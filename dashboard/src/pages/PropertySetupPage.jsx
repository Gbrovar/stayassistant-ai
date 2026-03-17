import SetupWizard from "./SetupWizard"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import Personalization from "./Personalization"
import Section from "../components/UI/Section"

export default function PropertySetupPage() {

    return (

        <div>

            <h1>Property Setup</h1>
            <p>Configure your AI concierge step by step.</p>

            {/* STEP 1 — PROPERTY BASICS */}

            <Section title="1. Property Information">
                <SetupWizard />
            </Section>

            {/* STEP 2 — FAQ */}

            <Section title="2. FAQ">
                <FAQEditor />
            </Section>

            {/* STEP 3 — RECOMMENDATIONS */}

            <Section title="3. Local Recommendations">
                <Recommendations />
            </Section>

            {/* STEP 4 — ASSISTANT */}

            <Section title="4. Assistant Settings">
                <Personalization />
            </Section>

            {/* STEP 5 — BRANDING */}
            <Section title="5. Widget Branding">
                <Branding />
            </Section>

        </div>

    )

}