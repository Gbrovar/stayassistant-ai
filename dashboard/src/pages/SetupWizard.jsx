import { useState } from "react"
import { API_URL } from "../api/config"

export default function SetupWizard() {

    const token = localStorage.getItem("token")

    const [address, setAddress] = useState("")
    const [city, setCity] = useState("")
    const [country, setCountry] = useState("")

    const [checkin, setCheckin] = useState("15:00")
    const [checkout, setCheckout] = useState("11:00")

    const [amenities, setAmenities] = useState("")
    const [services, setServices] = useState("")

    const [loading, setLoading] = useState(false)

    async function generate() {

        setLoading(true)

        if (!address || !city) {

            alert("Please enter property address and city")

            setLoading(false)

            return
        }

        const amenitiesList =
            amenities.split(",").map(a => a.trim()).filter(Boolean)

        const servicesList =
            services.split(",").map(s => s.trim()).filter(Boolean)

        /* STEP 1 — PROPERTY SETUP */

        const res = await fetch(`${API_URL}/property/setup`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                address,
                city,
                country,
                amenities: amenitiesList,
                services: servicesList
            })

        })

        const data = await res.json()

        if (!data.success) {

            alert("Property setup failed")

            setLoading(false)

            return
        }

        alert(`Location saved ✔

        Coordinates:
        ${data.coordinates.lat},
        ${data.coordinates.lng}`)

        /* STEP 2 — AI SETUP */

        await fetch(`${API_URL}/ai/setup`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                city,
                checkin,
                checkout
            })

        })

        setLoading(false)

        /* STEP 3 — REDIRECT */

        window.location.reload()

    }

    return (

        <div>

            <h2>Property Information</h2>

            <p>Configure your AI concierge in seconds.</p>

            <div className="wizard-field">

                <label>Property address</label>

                <input className="input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                />

            </div>

            <div className="wizard-field">

                <label>City</label>

                <input className="input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                />

            </div>

            <div className="wizard-field">

                <label>Country</label>

                <input className="input"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                />

            </div>

            <div className="wizard-field">

                <label>Check-in</label>

                <input className="input"
                    value={checkin}
                    onChange={(e) => setCheckin(e.target.value)}
                />

            </div>

            <div className="wizard-field">

                <label>Check-out</label>

                <input className="input"
                    value={checkout}
                    onChange={(e) => setCheckout(e.target.value)}
                />

            </div>

            <div className="wizard-field">

                <label>Amenities (comma separated)</label>

                <input className="input"
                    value={amenities}
                    onChange={(e) => setAmenities(e.target.value)}
                    placeholder="wifi,pool,parking"
                />

            </div>

            <div className="wizard-field">

                <label>Services (comma separated)</label>

                <input className="input"
                    value={services}
                    onChange={(e) => setServices(e.target.value)}
                    placeholder="airport transfer,bike rental"
                />

            </div>

            <button  className="btn btn-primary" onClick={generate} disabled={loading}>

                {loading ? "Generating..." : "Generate AI Concierge"}

            </button>
            {loading && <p>Setting up your AI concierge...</p>}

        </div>

    )

}