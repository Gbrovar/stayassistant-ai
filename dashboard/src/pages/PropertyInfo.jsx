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

            {/* resto igual que antes */}

        </div>
    )
}