import SetupWizard from "../SetupWizard"
import Onboarding from "./Onboarding"

export default function Property(){

  return(

    <div>

      <h1>Property</h1>

      <p>
        Configure your property information used by the AI concierge.
      </p>

      <section style={{marginTop:"30px"}}>
        <SetupWizard />
      </section>

      <section style={{marginTop:"50px"}}>
        <Onboarding />
      </section>

    </div>

  )

}