import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function PropertyInfo({ onComplete }) {

    const propertyId = getPropertyId()
    const { showToast, setRefreshPreview } = useContext(AppContext)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isAutoFilling, setIsAutoFilling] = useState(false)

    const fallbackWelcome =
        "Welcome 👋 I'm here to help you during your stay 😊"

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
        house_rules: "",
        amenities: [],
        services: []
    })

    const [newAmenity, setNewAmenity] = useState("")
    const [newService, setNewService] = useState("")

    useEffect(() => {
        async function load() {

            const [infoRes, brandingRes, setupRes] = await Promise.all([
                fetch(`${API_URL}/property/${propertyId}/property-info`, {
                    headers: { Authorization: "Bearer " + getToken() }
                }),
                fetch(`${API_URL}/property/${propertyId}/branding`, {
                    headers: { Authorization: "Bearer " + getToken() }
                }),
                fetch(`${API_URL}/property/${propertyId}`, {
                    headers: { Authorization: "Bearer " + getToken() }
                })
            ])

            const setupData = await setupRes.json()
            const infoData = await infoRes.json()
            const brandingData = await brandingRes.json()

            setForm(prev => ({
                ...prev,
                ...infoData.property_info,

                address: setupData.address || "",
                city: setupData.city || "",
                country: setupData.country || "",
                postal_code: setupData.postal_code || "",

                amenities: setupData.amenities || [],
                services: setupData.services || [],

                property_name: brandingData.property_name || prev.property_name,
                button_text: brandingData.button_text || prev.button_text
            }))
        }

        load()
    }, [])

    useEffect(() => {

        if (isAutoFilling) return // 🚫 NO autosave durante autofill

        const timeout = setTimeout(() => {
            if (Object.values(form).some(v => v)) {
                saveAll()
            }
        }, 2000)

        return () => clearTimeout(timeout)

    }, [JSON.stringify(form), isAutoFilling])

    useEffect(() => {

        function handleAutoFill(e) {

            const data = e.detail

            if (!data?.property_info) return

            setIsAutoFilling(true)

            setForm(prev => ({
                ...prev,
                ...data.property_info
            }))

            // ⏱️ desbloquear autosave después
            setTimeout(() => {
                setIsAutoFilling(false)
            }, 1500)
        }
        window.addEventListener("ai-autofill", handleAutoFill)

        return () => window.removeEventListener("ai-autofill", handleAutoFill)

    }, [])


    function handleChange(e) {

        const updated = {
            ...form,
            [e.target.name]: e.target.value
        }

        setForm(updated)

        // 🧠 detectar si usuario está completando dirección
        if (
            (e.target.name === "address" ||
                e.target.name === "city" ||
                e.target.name === "country") &&
            updated.address &&
            updated.city &&
            updated.country
        ) {
            // guardar en localStorage (opcional fallback UX)
            localStorage.setItem("property_address_ready", "true")
        }
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

    function Section({ title, children }) {
        return (
            <div className="card-v2">
                <div className="card-header">
                    <h3>{title}</h3>
                </div>

                <div className="stack">
                    {children}
                </div>
            </div>
        )
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
                    welcome_message: form.welcome_message,
                    house_rules: form.house_rules,
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

            // 🧠 VALIDACIÓN DIRECCIÓN (CRÍTICO)
            if (!form.address || !form.city || !form.country) {
                showToast("Please complete your property location to enable recommendations")
                return
            }

            // 🔵 VALIDACIÓN PRO (evitar datos basura)
            if (
                form.address.trim().length < 5 ||
                form.city.trim().length < 2 ||
                form.country.trim().length < 2
            ) {
                showToast("Please enter a valid property location")
                return
            }

            await fetch(`${API_URL}/property/setup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getToken()
                },
                body: JSON.stringify({
                    address: form.address || "",
                    city: form.city || "",
                    country: form.country || "",
                    postal_code: form.postal_code || "",
                    amenities: form.amenities || [],
                    services: form.services || []
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

    /* UI */

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

    function Input({ label, placeholder, ...props }) {
        return (
            <div>
                <label>{label}</label>
                <input className="input" placeholder={placeholder} {...props} />
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
                        placeholder="Type and click Add..."
                    />

                    <button className="btn btn-secondary" onClick={() => onAdd(newValue)}>
                        Add
                    </button>
                </div>

            </div>
        )
    }

    
    return (

        <div className="stack-xl">

            <div style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                marginBottom: 10
            }}>
                {saving && (
                    <div style={{
                        background: "#1f2937",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#94a3b8",
                        display: "inline-block"
                    }}>
                        Saving...
                    </div>
                )}

                {saved && (
                    <div style={{
                        background: "rgba(34,197,94,0.15)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#22c55e",
                        display: "inline-block"
                    }}>
                        Saved ✓
                    </div>
                )}
            </div>

            {/* BASIC */}
            <Section title="Basic info">
                <Grid>
                    <Input
                        label="Property name"
                        name="property_name"
                        value={form.property_name}
                        placeholder="e.g. Villa Sunset, Hotel Central..."
                        onChange={handleChange}
                    />

                    <Input
                        label="Widget text"
                        name="button_text"
                        value={form.button_text}
                        placeholder="e.g. Ask concierge"
                        onChange={handleChange}
                    />
                </Grid>

                <Textarea
                    label="Welcome message"
                    name="welcome_message"
                    value={form.welcome_message}
                    placeholder={fallbackWelcome}
                    onChange={handleChange}
                />
            </Section>

            {/* LOCATION */}
            <Section title="Location">
                <Input
                    label="Address"
                    name="address"
                    value={form.address}
                    placeholder="Street name and number"
                    onChange={handleChange}
                />

                <Grid>
                    <Input
                        label="City"
                        name="city"
                        value={form.city}
                        placeholder="e.g. Barcelona"
                        onChange={handleChange}
                    />

                    <Input
                        label="Country"
                        name="country"
                        value={form.country}
                        placeholder="e.g. Spain"
                        onChange={handleChange}
                    />

                    <Input
                        label="Postal code"
                        name="postal_code"
                        value={form.postal_code}
                        placeholder="e.g. 08001"
                        onChange={handleChange}
                    />
                </Grid>

                <p className="text-muted">
                    This location is used to generate real local recommendations for your guests.
                </p>
            </Section>

            {/* CONTACT */}
            <Section title="Contact">
                <p className="text-muted">
                    This will be shared with guests if they need to contact you.
                </p>

                <Grid>
                    <Input
                        label="Phone"
                        name="phone"
                        value={form.phone}
                        placeholder="+34 600 000 000"
                        onChange={handleChange}
                    />

                    <Input
                        label="Email"
                        name="email"
                        value={form.email}
                        placeholder="contact@yourproperty.com"
                        onChange={handleChange}
                    />
                </Grid>
            </Section>

            {/* STAY */}
            <Section title="Stay details">
                <Grid>
                    <Input label="Check-in" name="checkin" value={form.checkin} onChange={handleChange} />
                    <Input label="Check-out" name="checkout" value={form.checkout} onChange={handleChange} />
                </Grid>

                <Textarea
                    label="Check-in instructions"
                    name="checkin_instructions"
                    value={form.checkin_instructions}
                    placeholder="Explain how guests should check in"
                    onChange={handleChange}
                />

                <Textarea
                    label="Late check-in"
                    name="late_checkin"
                    value={form.late_checkin}
                    placeholder="Instructions for late arrivals"
                    onChange={handleChange}
                />
            </Section>

            <Section title="House rules">
                <p className="text-muted">
                    Inform guests about important rules (e.g. no smoking, no parties).
                </p>

                <Textarea
                    label="Rules"
                    name="house_rules"
                    value={form.house_rules}
                    placeholder="e.g. No smoking inside. Quiet hours after 22:00."
                    onChange={handleChange}
                />
            </Section>

            {/* AMENITIES */}
            <Section title="Amenities">
                <p className="text-muted">
                    Facilities available for guests (e.g. WiFi, pool, air conditioning).
                </p>

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
                <p className="text-muted">
                    Services you offer (e.g. airport transfer, breakfast, cleaning).
                </p>

                <Chips
                    items={form.services}
                    newValue={newService}
                    setNewValue={setNewService}
                    onAdd={(v) => addItem("services", v)}
                    onRemove={(i) => removeItem("services", i)}
                />
            </Section>

            <div style={{ marginTop: 20 }}>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        if (onComplete) onComplete()
                    }}
                >
                    Continue →
                </button>
            </div>

        </div>
    )
}

