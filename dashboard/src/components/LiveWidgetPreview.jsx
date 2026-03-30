import { useEffect } from "react"

export default function LiveWidgetPreview({ propertyId, refresh }) {

    useEffect(() => {
        if (!propertyId) return

        // limpiar widget anterior
        const existing = document.getElementById("stayassistant-widget")
        if (existing) existing.remove()

        const script = document.createElement("script")
        script.id = "stayassistant-widget"
        script.src = `${import.meta.env.VITE_API_URL}/widget.js`
        script.async = true

        script.onload = () => {
            if (window.StayAssistant) {
                window.StayAssistant.init({
                    propertyId,
                    preview: true // 👈 clave
                })
            }
        }

        const container = document.getElementById("widget-preview-container")

        if (container) {
            container.appendChild(script)
        }

    }, [propertyId, refresh])

    return (
        <div
            id="widget-preview-container"
            style={{
                position: "relative",
                height: 600,
                borderRadius: 16,
                //background: "#0b1220",
                overflow: "hidden"
            }}
        >
            {/* Fondo simulando web */}
        </div>
    )
}