import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Register() {

  const navigate = useNavigate()

  const { showToast } = useContext(AppContext);
  const [propertyName, setPropertyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function register() {

    const res = await fetch(`${API_URL}/auth/register`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        property_name: propertyName,
        email,
        password
      })

    })

    const data = await res.json()

    if (data.token) {

      localStorage.setItem("token", data.token)
      localStorage.setItem("propertyId", data.propertyId)
      localStorage.setItem("propertyName", propertyName)

      navigate("/property")

    } else {

      showToast("Registration failed")

    }

  }

  return (

    <div className="centered">
      <div className="auth-card">

        <h1 className="auth-title">Create your StayAssistant</h1>
        <p className="auth-subtitle">Start in 30 seconds</p>

        <div className="auth-form">

          <input
            className="input"
            placeholder="Property name"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="btn btn-primary btn-full"
            onClick={register}
          >
            Create property
          </button>

        </div>

      </div>
    </div>

  )

}