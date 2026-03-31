import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function PropertyInfo() {

    const propertyId = getPropertyId()
    const { showToast, setRefreshPreview } = useContext(AppContext)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

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
        amenities: [],
        services: []
    })

    const [newAmenity, setNewAmenity] = useState("")
    const [newService, setNewService] = useState("")

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
                property_name: brandingData.property_name || "",
                button_text: brandingData.button_text || ""
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

    function addItem(type, value) {
        if (!value.trim()) return

        setForm(prev => ({
            ...prev,
            [type]: [...prev[type], value.trim()]
        }))

        type === "amenities" ? setNewAmenity("") : setNewService("")
    }

    function removeItem(type, index) {
        const copy = [...form[type]]
        copy.splice(index, 1)

        setForm(prev => ({
            ...prev,
            [type]: copy
        }))
    }

    async function saveAll() {

        setSaving(true)
        setSaved(false)

        try {

            await fetch(`${API_URL}/property/${propertyId}/property-info`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getToken()
                },
                body: JSON.stringify({
                    checkin: form.checkin,
                    checkout: form.checkout,
                    checkin_instructions: form.checkin_instructions,
                    late_checkin: form.late_checkin,
                    phone: form.phone,
                    email: form.email,
                    welcome_message: form.welcome_message
                })
            })

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
                    amenities: form.amenities,
                    services: form.services
                })
            })

            setSaved(true)
            setRefreshPreview(prev => prev + 1)

            setTimeout(() => setSaved(false), 1500)

        } catch {
            showToast("Error saving")
        }

        setSaving(false)
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            saveAll()
        }, 800)

        return () => clearTimeout(timeout)
    }, [form])

    return (

        <div className="stack" style={{ gap: 28 }}>

            {saving && <div style={{ fontSize: 12, color: "#94a3b8" }}>Saving...</div>}
            {saved && <div style={{ fontSize: 12, color: "#22c55e" }}>Saved ✓</div>}

            {/* BASIC */}
            <Section title="Basic info">
                <Grid>
                    <Input label="Property name" name="property_name" value={form.property_name} onChange={handleChange} />
                    <Input label="Widget text" name="button_text" value={form.button_text} onChange={handleChange} />
                </Grid>

                <Textarea label="Welcome message" name="welcome_message" value={form.welcome_message} onChange={handleChange} />
            </Section>

            {/* LOCATION */}
            <Section title="Location">
                <Input label="Address" name="address" value={form.address} onChange={handleChange} />

                <Grid>
                    <Input label="City" name="city" value={form.city} onChange={handleChange} />
                    <Input label="Country" name="country" value={form.country} onChange={handleChange} />
                </Grid>
            </Section>

            {/* CONTACT */}
            <Section title="Contact">
                <Grid>
                    <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
                    <Input label="Email" name="email" value={form.email} onChange={handleChange} />
                </Grid>
            </Section>

            {/* STAY */}
            <Section title="Stay details">
                <Grid>
                    <Input label="Check-in" name="checkin" value={form.checkin} onChange={handleChange} />
                    <Input label="Check-out" name="checkout" value={form.checkout} onChange={handleChange} />
                </Grid>

                <Textarea label="Check-in instructions" name="checkin_instructions" value={form.checkin_instructions} onChange={handleChange} />
                <Textarea label="Late check-in" name="late_checkin" value={form.late_checkin} onChange={handleChange} />
            </Section>

            {/* AMENITIES */}
            <Section title="Amenities">
                <Chips
                    items={form.amenities}
                    newValue={newAmenity}
                    setNewValue={setNewAmenity}
                    onAdd={(v) => addItem("amenities", v)}
                    onRemove={(i) => removeItem("amenities", i)}
                />
            </Section>

            {/* SERVICES */}
            <Section title="Services">
                <Chips
                    items={form.services}
                    newValue={newService}
                    setNewValue={setNewService}
                    onAdd={(v) => addItem("services", v)}
                    onRemove={(i) => removeItem("services", i)}
                />
            </Section>

        </div>
    )
}

/* UI */

function Section({ title, children }) {
    return (
        <div>
            <h3 style={{ marginBottom: 10 }}>{title}</h3>
            <div className="stack" style={{ gap: 14 }}>
                {children}
            </div>
        </div>
    )
}

function Grid({ children }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
        }}>
            {children}
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

function Chips({ items, newValue, setNewValue, onAdd, onRemove }) {
    return (
        <div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {items.map((item, i) => (
                    <div key={i} style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(99,102,241,0.15)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                    }}>
                        {item}
                        <span
                            style={{ cursor: "pointer", opacity: 0.6 }}
                            onClick={() => onRemove(i)}
                            onMouseEnter={(e) => e.target.style.opacity = 1}
                            onMouseLeave={(e) => e.target.style.opacity = 0.6}
                        >
                            ✕
                        </span>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <input
                    className="input"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Add..."
                />

                <button className="btn btn-secondary" onClick={() => onAdd(newValue)}>
                    Add
                </button>
            </div>

        </div>
    )
}