import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function PropertyInfo() {

    const propertyId = getPropertyId()
    const { showToast, setRefreshPreview } = useContext(AppContext)

    const [loading, setLoading] = useState(false)

    const [form, setForm] = useState({
        property_name: "",
        button_text: "",
        welcome_message: "",

        address: "",
        city: "",
        country: "",
        postal_code: "",

        phone: "",
        email: "",

        checkin: "",
        checkout: "",
        checkin_instructions: "",
        late_checkin: "",

        amenities: "",
        services: ""
    })

    useEffect(() => {
        async function load() {

            const [infoRes, brandingRes] = await Promise.all([
                fetch(`${API_URL}/property/${propertyId}/property-info`, {
                    headers: { Authorization: "Bearer " + getToken() }
                }),
                fetch(`${API_URL}/property/${propertyId}/branding`, {
                    headers: { Authorization: "Bearer " + getToken() }
                })
            ])

            const infoData = await infoRes.json()
            const brandingData = await brandingRes.json()

            setForm(prev => ({
                ...prev,
                ...infoData.property_info,
                property_name: brandingData.property_name,
                button_text: brandingData.button_text
            }))
        }

        load()
    }, [])

    function handleChange(e) {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        })
    }

    async function saveAll() {

        setLoading(true)

        /* --- 1. PROPERTY INFO --- */
        await fetch(`${API_URL}/property/${propertyId}/property-info`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(form)
        })

        /* --- 2. BRANDING --- */
        await fetch(`${API_URL}/property/${propertyId}/branding`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify({
                property_name: form.property_name,
                button_text: form.button_text,
                primary_color: "#22c55e"
            })
        })

        /* --- 3. SETUP (address + services) --- */
        await fetch(`${API_URL}/property/setup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify({
                address: form.address,
                city: form.city,
                country: form.country,
                amenities: form.amenities.split(","),
                services: form.services.split(",")
            })
        })

        showToast("Saved successfully")
        setRefreshPreview(prev => prev + 1)

        setLoading(false)
    }

    return (

        <div>

            {/* BASIC */}
            <Section title="Basic info">

                <Input label="Property name" name="property_name" value={form.property_name} onChange={handleChange} />
                <Input label="Widget button text" name="button_text" value={form.button_text} onChange={handleChange} />
                <Input label="Welcome message" name="welcome_message" value={form.welcome_message} onChange={handleChange} />

            </Section>

            {/* LOCATION */}
            <Section title="Location">

                <Input label="Address" name="address" value={form.address} onChange={handleChange} />
                <Input label="City" name="city" value={form.city} onChange={handleChange} />
                <Input label="Country" name="country" value={form.country} onChange={handleChange} />
                <Input label="Postal code" name="postal_code" value={form.postal_code} onChange={handleChange} />

            </Section>

            {/* CONTACT */}
            <Section title="Contact">

                <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
                <Input label="Email" name="email" value={form.email} onChange={handleChange} />

            </Section>

            {/* STAY */}
            <Section title="Stay details">

                <Input label="Check-in" name="checkin" value={form.checkin} onChange={handleChange} />
                <Input label="Check-out" name="checkout" value={form.checkout} onChange={handleChange} />

                <Textarea label="Check-in instructions" name="checkin_instructions" value={form.checkin_instructions} onChange={handleChange} />
                <Textarea label="Late check-in" name="late_checkin" value={form.late_checkin} onChange={handleChange} />

            </Section>

            {/* SERVICES */}
            <Section title="Services & amenities">

                <Input label="Amenities (comma separated)" name="amenities" value={form.amenities} onChange={handleChange} />
                <Input label="Services (comma separated)" name="services" value={form.services} onChange={handleChange} />

            </Section>

            <button className="btn btn-primary" onClick={saveAll} disabled={loading}>
                {loading ? "Saving..." : "Save all"}
            </button>

        </div>

    )
}

/* --- UI COMPONENTS --- */

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 10 }}>{title}</h3>
            <div style={{ display: "grid", gap: 12 }}>
                {children}
            </div>
        </div>
    )
}

function Input({ label, ...props }) {
    return (
        <div>
            <label>{label}</label>
            <input className="input" {...props} />
        </div>
    )
}

function Textarea({ label, ...props }) {
    return (
        <div>
            <label>{label}</label>
            <textarea className="input" {...props} />
        </div>
    )
}