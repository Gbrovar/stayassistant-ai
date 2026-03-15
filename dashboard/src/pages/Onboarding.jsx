import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { API_URL } from "../api/config"

export default function Onboarding() {

    const navigate = useNavigate()

    const [progress, setProgress] = useState({})

    useEffect(() => {

        const token = localStorage.getItem("token")

        fetch(`${API_URL}/onboarding/status`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => setProgress(data))

    }, [])

    function finishSetup() {
        navigate("/analytics")
    }

    return (

        <div className="onboarding">

            <h1>Welcome to StayAssistant</h1>

            <p>
                Your AI concierge is almost ready.
                Complete these steps to activate it.
            </p>

            <div className="onboarding-steps">

                <div className="step">
                    <h3>1. Add FAQ {progress.faq ? "✅" : "⬜"}</h3>
                    <p>Tell the assistant about your property.</p>
                </div>

                <div className="step">
                    <h3>2. Add recommendations {progress.recommendations ? "✅" : "⬜"}</h3>
                    <p>Restaurants, transport, pharmacies.</p>
                </div>

                <div className="step">
                    <h3>3. Install widget {progress.widget ? "✅" : "⬜"}</h3>
                    <p>Add the assistant to your website.</p>
                </div>

            </div>

            <button onClick={finishSetup}>
                Go to Dashboard
            </button>

        </div>

    )

}