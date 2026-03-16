import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function Insights(){

  const propertyId = localStorage.getItem("propertyId")
  const token = localStorage.getItem("token")

  const [suggestions,setSuggestions] = useState([])

  async function addToFAQ(question){

    await fetch(`${API_URL}/property/${propertyId}/faq`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({
        question,
        answer:""
      })
    })

    alert("Added to FAQ")

  }

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

      <h2>AI Insights</h2>

      <p>
        The AI detected questions guests frequently ask but are not yet covered in your FAQ.
      </p>

      {suggestions.length===0 && (

        <div className="analytics-card">
          No new suggestions yet.
        </div>

      )}

      {suggestions.map(s=>(

        <div key={s.question} className="analytics-card">

          <p>
            Guests asked <strong>{s.count}</strong> times
          </p>

          <h3>{s.question}</h3>

          <button
            className="action-btn"
            onClick={()=>addToFAQ(s.question)}
          >
            Add to FAQ
          </button>

        </div>

      ))}

    </div>

  )

}