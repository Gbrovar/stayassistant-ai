import { useNavigate } from "react-router-dom"

export default function Onboarding(){

  const navigate = useNavigate()

  function finishSetup(){
    navigate("/analytics")
  }

  return(

    <div className="onboarding">

      <h1>Welcome to StayAssistant</h1>

      <p>
        Your AI concierge is almost ready.
        Complete these steps to activate it.
      </p>

      <div className="onboarding-steps">

        <div className="step">
          <h3>1. Add FAQ</h3>
          <p>Tell the assistant about your property.</p>
        </div>

        <div className="step">
          <h3>2. Add recommendations</h3>
          <p>Restaurants, transport, pharmacies.</p>
        </div>

        <div className="step">
          <h3>3. Install widget</h3>
          <p>Add the assistant to your website.</p>
        </div>

      </div>

      <button onClick={finishSetup}>
        Go to Dashboard
      </button>

    </div>

  )

}