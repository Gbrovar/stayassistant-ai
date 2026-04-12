import { useEffect, useState, useRef } from "react"
import React from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import Input from "../components/UI/Input";
import Textarea from "../components/UI/Textarea";
import Button from "../components/UI/Button"

const SaveIndicator = React.memo(({ saving, saved, dirty }) => {
    return (
        <div className={`save-indicator ${saving ? "saving" :
            saved ? "saved" :
                dirty ? "unsaved" : ""
            }`}>
            {saving && "Saving..."}
            {saved && "Saved ✓"}
            {!saving && !saved && dirty && "Unsaved changes"}
        </div>
    )
})

function Section({ title, children }) {
    return (
        <div className="card-v2">
            <div className="section-title-v2">
                {title}
            </div>

            <div className="stack">
                {children}
            </div>
        </div>
    )
}

 function Grid({ children }) {
        return (
            <div className="form-grid-2">
                {children}
            </div>
        )
    }

    function Chips({ items, newValue, setNewValue, onAdd, onRemove }) {
        return (
            <div>

                <div className="chips-container">
                    {items.map((item, i) => (
                        <div key={i} className="chip">
                            {item}
                            <span className="chip-remove" onClick={() => onRemove(i)}>✕</span>
                        </div>
                    ))}
                </div>

                <div className="chips-input-row">
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

export default function PropertyInfo({ onComplete }) {

    const propertyId = getPropertyId()
    const { showToast, setRefreshPreview } = useContext(AppContext)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isAutoFilling, setIsAutoFilling] = useState(false)

    /* AUTOSAVE SYSTEM */
    const [dirty, setDirty] = useState(false)
    const [lastSavedData, setLastSavedData] = useState(null)
    const typingTimeoutRef = useRef(null)
    /* ********* */

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

            const initialForm = {
                ...infoData.property_info,

                address: setupData.address || "",
                city: setupData.city || "",
                country: setupData.country || "",
                postal_code: setupData.postal_code || "",

                amenities: setupData.amenities || [],
                services: setupData.services || [],

                property_name: brandingData.property_name || "",
                button_text: brandingData.button_text || ""
            }

            setForm(initialForm)
            setLastSavedData(initialForm)
        }

        load()
    }, [])


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

        if (!dirty) setDirty(true)
    }


    /*
    function handleChange(e) {
        

        const updated = {
            ...form,
            [e.target.name]: e.target.value
        }

        setForm(updated)
        if (!dirty) {
            setDirty(true)
        }

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
    */

    function handleBlur() {
        if (!dirty) return

        silentSave()
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

    async function saveAll({ silent = false } = {}) {

        if (!silent) {
            setSaving(true)
            setSaved(false)
        }

        try {

            //1. BASISC INFO
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

            //2. BRANDING
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
            if (!silent) {

                if (!form.address || !form.city || !form.country) {
                    showToast("Please complete your property location to enable recommendations")
                    return
                }

                if (
                    form.address.trim().length < 5 ||
                    form.city.trim().length < 2 ||
                    form.country.trim().length < 2
                ) {
                    showToast("Please enter a valid property location")
                    return
                }

            }

            //3. SETUP (LOCATION)
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

            if (!silent) {
                showToast("Saved successfully")
            }

            setTimeout(() => setSaved(false), 1500)

        } catch {
            showToast("Error saving")
        }

        if (!silent) {
            setSaving(false)
        }

    }

    async function silentSave() {

        // 🧠 evitar guardar si no hay cambios reales
        if (JSON.stringify(form) === JSON.stringify(lastSavedData)) return

        try {

            await saveAll({ silent: true })

            setLastSavedData({ ...form })
            setDirty(false)

        } catch (err) {
            console.error("Silent save failed", err)
        }
    }

    /* UI */

   


    return (

        <div className="stack-xl">

            <SaveIndicator
                saving={saving}
                saved={saved}
                dirty={dirty}
            />

            {/* BASIC */}
            <Section title="Basic info">

                <div className="form-group-block">
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
                </div>

                <div className="form-group-block">
                    <Textarea
                        label="Welcome message"
                        name="welcome_message"
                        value={form.welcome_message}
                        placeholder={fallbackWelcome}
                        onChange={handleChange}
                    />
                </div>

            </Section>

            {/* LOCATION */}
            <Section title="Location">

                <div className="form-group-block">
                    <Input
                        label="Address"
                        name="address"
                        value={form.address}
                        placeholder="Street name and number"
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group-block">
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
                </div>

                <p className="text-muted">
                    This location is used to generate real local recommendations for your guests.
                </p>
            </Section>

            {/* CONTACT */}
            <Section title="Contact">
                <p className="text-muted">
                    This will be shared with guests if they need to contact you.
                </p>

                <div className="form-group-block">
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
                </div>
            </Section>

            {/* STAY */}
            <Section title="Stay details">

                <div className="form-group-block">
                    <Grid>
                        <Input
                            label="Check-in"
                            name="checkin"
                            value={form.checkin}
                            onChange={handleChange}
                        />

                        <Input
                            label="Check-out"
                            name="checkout"
                            value={form.checkout}
                            onChange={handleChange}
                        />
                    </Grid>
                </div>

                <div className="form-group-block">
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
                </div>
            </Section>

            <Section title="House rules">
                <p className="text-muted">
                    Inform guests about important rules (e.g. no smoking, no parties).
                </p>

                <div className="form-group-block">
                    <Textarea
                        label="Rules"
                        name="house_rules"
                        value={form.house_rules}
                        placeholder="e.g. No smoking inside. Quiet hours after 22:00."
                        onChange={handleChange}
                    />
                </div>
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

            <div className="flex-between mt-md">

                <Button
                    variant="secondary"
                    onClick={() => saveAll()}
                >
                    Save changes
                </Button>

                <Button
                    className="btn btn-md btn-primary"
                    onClick={() => {
                        if (onComplete) onComplete()
                    }}
                >
                    Continue →
                </Button>

            </div>

        </div>
    )
}

