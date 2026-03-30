import SetupWizard from "./SetupWizard"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import Personalization from "./Personalization"
import Section from "../components/UI/Section"
import PropertyInfo from "./PropertyInfo"
import Preview from "./Preview"

export default function PropertySetupPage() {

    return (

        <div className="page">

            <div className="page-header">
                <h1 className="page-title">Property Setup</h1>
                <p className="page-subtitle">
                    Configure your AI concierge step by step.
                </p>
            </div>

            <div className="stack">

                <Section title="1. Property Info">
                    <PropertyInfo />
                </Section>

                <Section title="2. Assistant Settings">
                    <Personalization />
                </Section>

                <Section title="3. FAQ">
                    <FAQEditor />
                </Section>

                <Section title="4. Local Recommendations">
                    <Recommendations />
                </Section>

                <Section title="5. Widget Branding">
                    <Branding />
                </Section>

                <Section title="6. Live Preview">
                    <Preview />
                </Section>

            </div>

        </div>

    )

}