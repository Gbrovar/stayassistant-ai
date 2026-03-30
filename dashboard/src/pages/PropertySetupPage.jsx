import SetupWizard from "./SetupWizard"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import Branding from "./Branding"
import Personalization from "./Personalization"
import Section from "../components/UI/Section"
import PropertyInfo from "./PropertyInfo"
import LiveWidgetPreview from "../components/LiveWidgetPreview"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import { getPropertyId } from "../api/auth"


export default function PropertySetupPage() {

    const { refreshPreview } = useContext(AppContext)
    const propertyId = getPropertyId()

    return (

        <div className="page">

            <div className="page-header">
                <h1 className="page-title">Property Setup</h1>
                <p className="page-subtitle">
                    Set up your AI concierge in minutes.
                </p>
            </div>

            <div style={{
                display: "flex",
                gap: 10,
                marginBottom: 20
            }}>
                {["Property", "Assistant", "Knowledge", "Branding"].map((step, i) => (
                    <div key={i} style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.1)"
                    }} />
                ))}
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 420px",
                gap: 24,
                alignItems: "start"
            }}>

                {/* LEFT SIDE */}
                <div className="stack">

                    <Section title="Step 1 — Your property">
                        <PropertyInfo />
                    </Section>

                    <Section title="Step 2 — Your assistant">
                        <Personalization />
                    </Section>

                    <Section title="Step 3 — What it can answer">
                        <FAQEditor />
                        <Recommendations />
                    </Section>

                    <Section title="Step 4 — Look & feel">
                        <Branding />
                    </Section>
                </div>

                {/* RIGHT SIDE → LIVE WIDGET */}
                <div style={{
                    position: "sticky",
                    top: 20
                }}>

                    <div style={{
                        fontSize: 12,
                        opacity: 0.6,
                        marginBottom: 8
                    }}>
                        See how your concierge responds in real time
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