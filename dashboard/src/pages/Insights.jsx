import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function Insights(){

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions,setSuggestions] = useState([])

  useEffect(()=>{

    async function load(){

      const res = await fetch(
        `${API_URL}/analytics/${propertyId}/faq-suggestions`,
        {
          headers:{Authorization:`Bearer ${token}`}
        }
      )

      const data = await res.json()

      setSuggestions(data.suggestions || [])

    }

    load()

  },[propertyId,token])

  return(

    <div>

      <h1>AI Insights</h1>

      {suggestions.map(s=>(

        <div key={s.question} className="analytics-card">

          <p>
            Guests asked <strong>{s.count}</strong> times:
          </p>

          <h3>{s.question}</h3>

        </div>

      ))}

    </div>

  )

}