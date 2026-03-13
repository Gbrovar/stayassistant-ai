import {useState,useEffect} from "react"
import {useNavigate} from "react-router-dom"

export default function Login(){

  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")

  const navigate = useNavigate()

  useEffect(()=>{

    const token = localStorage.getItem("token")

    if(token){
      navigate("/analytics")
    }

  },[])

  async function login(){

    const res = await fetch("http://localhost:3000/auth/login",{

      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({
        email,
        password
      })

    })

    const data = await res.json()

    if(data.token){

      localStorage.setItem("token",data.token)
      localStorage.setItem("propertyId",data.propertyId)

      navigate("/analytics")

    }else{

      alert("Invalid login")

    }

  }

  return(

    <div className="login-page">

      <h1>StayAssistant Login</h1>

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

      <button onClick={login}>
        Login
      </button>

      <p>
        Don't have an account?
        <a href="/register">Create property</a>
      </p>

    </div>

  )

}