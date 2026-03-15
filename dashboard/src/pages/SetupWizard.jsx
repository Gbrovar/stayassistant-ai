import { useState } from "react"
import { API_URL } from "../api/config"

export default function SetupWizard(){

  const token = localStorage.getItem("token")

  const [city,setCity] = useState("")
  const [checkin,setCheckin] = useState("15:00")
  const [checkout,setCheckout] = useState("11:00")

  const [loading,setLoading] = useState(false)

  async function generate(){

    setLoading(true)

    await fetch(`${API_URL}/ai/setup`,{

      method:"POST",

      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },

      body:JSON.stringify({
        city,
        checkin,
        checkout
      })

    })

    setLoading(false)

    window.location.href="/dashboard/faq"

  }

  return(

    <div>

      <h1>AI Setup Wizard</h1>

      <p>Configure your AI concierge in seconds.</p>

      <div className="wizard-field">

        <label>City</label>

        <input
          value={city}
          onChange={(e)=>setCity(e.target.value)}
        />

      </div>

      <div className="wizard-field">

        <label>Check-in</label>

        <input
          value={checkin}
          onChange={(e)=>setCheckin(e.target.value)}
        />

      </div>

      <div className="wizard-field">

        <label>Check-out</label>

        <input
          value={checkout}
          onChange={(e)=>setCheckout(e.target.value)}
        />

      </div>

      <button onClick={generate} disabled={loading}>

        {loading ? "Generating..." : "Generate AI Concierge"}

      </button>

    </div>

  )

}