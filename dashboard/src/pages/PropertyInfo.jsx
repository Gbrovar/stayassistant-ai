import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"

export default function PropertyInfo() {

    const propertyId = getPropertyId()

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

        alert("Property info saved")

    }

    return (

        <div>

            <h2>Property Info</h2>

            <Card>

                <div className="branding-field">
                    <label>Check-in</label>
                    <input name="checkin" value={form.checkin} onChange={handleChange} />
                </div>

                <div className="branding-field">
                    <label>Check-out</label>
                    <input name="checkout" value={form.checkout} onChange={handleChange} />
                </div>

                <div className="branding-field">
                    <label>Check-in instructions</label>
                    <textarea
                        name="checkin_instructions"
                        value={form.checkin_instructions}
                        onChange={handleChange}
                    />
                </div>

                <div className="branding-field">
                    <label>Late check-in instructions</label>
                    <textarea
                        name="late_checkin"
                        value={form.late_checkin}
                        onChange={handleChange}
                    />
                </div>

                <div className="branding-field">
                    <label>WiFi name</label>
                    <input name="wifi_name" value={form.wifi_name} onChange={handleChange} />
                </div>

                <div className="branding-field">
                    <label>WiFi password</label>
                    <input name="wifi_password" value={form.wifi_password} onChange={handleChange} />
                </div>

                <button className="save-btn" onClick={save}>
                    Save
                </button>

            </Card>

        </div>

    )

}