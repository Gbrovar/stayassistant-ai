import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import { Link } from "react-router-dom"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { showToast } = useContext(AppContext);

  const navigate = useNavigate()

  useEffect(() => {

    const token = localStorage.getItem("token")

    if (token) {
      navigate("/")
    }

  }, [])

  async function login() {

    const res = await fetch(`${API_URL}/auth/login`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        password
      })

    })

    const data = await res.json()

    if (data.token) {

      localStorage.setItem("token", data.token)
      localStorage.setItem("propertyId", data.propertyId)

      navigate("/")

    } else {

      showToast("Invalid login");

    }

  }

  return (

    <div className="login-page">

      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Login to your dashboard</p>

      <div className="auth-form">
        <input className="input" placeholder="Email" />
        <input className="input" placeholder="Password" type="password" />

        <button className="btn btn-primary btn-full">
          Login
        </button>
      </div>

      <p>
        Don't have an account?
        <Link to="../register">Create property</Link>
      </p>

    </div>

  )

}