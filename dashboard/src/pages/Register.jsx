import {useState} from "react"
import {useNavigate} from "react-router-dom"
import { API_URL } from "../api/config"

export default function Register(){

  const navigate = useNavigate()

  const [propertyName,setPropertyName]=useState("")
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")

  async function register(){

    const res = await fetch(`${API_URL}/auth/register`,{

      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({
        property_name:propertyName,
        email,
        password
      })

    })

    const data = await res.json()

    if(data.token){

      localStorage.setItem("token",data.token)
      localStorage.setItem("propertyId",data.propertyId)

      navigate("/setupwizard")

    }else{

      alert("Registration failed")

    }

  }

  return(

    <div className="login-page">

      <h1>Create your StayAssistant</h1>

      <input
        placeholder="Property name"
        value={propertyName}
        onChange={(e)=>setPropertyName(e.target.value)}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button onClick={register}>
        Create property
      </button>

    </div>

  )

}