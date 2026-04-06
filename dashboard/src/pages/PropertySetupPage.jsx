import PropertyInfo from "./PropertyInfo"
import FAQEditor from "./FAQEditor"
import Recommendations from "./Recommendations"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import Section from "../components/UI/Section"

export default function PropertySetupPage() {

  const { refreshPreview } = useContext(AppContext)

  return (
    <div className="container">

      <div className="page-header">
        <h1 className="title-lg">Your AI concierge</h1>
        <p className="page-subtitle">
          Configure how your assistant works and responds to guests.
        </p>
      </div>

      <div className="setup-layout">

        <div className="setup-main">

          <Section title="1. Basics">
            <PropertyInfo />
          </Section>

          <Section title="2. Train your AI">
            <FAQEditor />
          </Section>

          <Section title="3. Recommendations">
            <Recommendations />
          </Section>

        </div>

      </div>

    </div>
  )
}