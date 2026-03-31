import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function PropertyInfo() {

    const propertyId = getPropertyId()
    const { showToast, setRefreshPreview } = useContext(AppContext)

    const [showAdvanced, setShowAdvanced] = useState(false)

    const [form, setForm] = useState({
        checkin: "",
        checkout: "",
        checkin_instructions: "",
        late_checkin: "",
        wifi_name: "",
        wifi_password: ""
    })

    useEffect(() => {
        async function load() {

            const res = await fetch(`${API_URL}/property/${propertyId}/property-info`, {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            })

            const data = await res.json()

            if (data.property_info) {
                setForm(data.property_info)
            }
        }

        load()
    }, [])

    function handleChange(e) {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        })
    }

    async function save() {

        await fetch(`${API_URL}/property/${propertyId}/property-info`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(form)
        })

        showToast("Property info saved");
        setRefreshPreview(prev => prev + 1)

    }

    return (

        <>

            <div style={{ marginBottom: 16, opacity: 0.7 }}>
                Key stay details guests usually ask for
            </div>

            {/* BASIC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                <div>
                    <label>Check-in</label>
                    <input className="input" name="checkin" value={form.checkin} onChange={handleChange} />
                </div>

                <div>
                    <label>Check-out</label>
                    <input className="input" name="checkout" value={form.checkout} onChange={handleChange} />
                </div>

            </div>

            {/* TOGGLE */}
            <button
                className="show-more-btn"
                onClick={() => setShowAdvanced(!showAdvanced)}
            >
                {showAdvanced ? "Hide details" : "Show more settings"}
            </button>

            {/* ADVANCED */}
            {showAdvanced && (
                <>
                    <div style={{ marginTop: 14 }}>
                        <label>Check-in instructions</label>
                        <textarea className="input" name="checkin_instructions" value={form.checkin_instructions} onChange={handleChange} />
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <label>Late check-in</label>
                        <textarea className="input" name="late_checkin" value={form.late_checkin} onChange={handleChange} />
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <label>WiFi name</label>
                        <input className="input" name="wifi_name" value={form.wifi_name} onChange={handleChange} />
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <label>WiFi password</label>
                        <input className="input" name="wifi_password" value={form.wifi_password} onChange={handleChange} />
                    </div>
                </>
            )}

            <div style={{ marginTop: 18 }}>
                <button className="btn btn-primary" onClick={save}>
                    Save
                </button>
            </div>

        </>

    )
}