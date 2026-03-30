import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function BillingSuccess() {

  const navigate = useNavigate()

  useEffect(() => {

    const timer = setTimeout(() => {
      navigate("/billing")
    }, 3000)

    return () => clearTimeout(timer)

  }, [])

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      flexDirection: "column"
    }}>

      <h1>🎉 Payment successful</h1>

      <p>Your subscription is now active</p>

      <p className="muted">
        Redirecting to billing...
      </p>

    </div>
  )
}