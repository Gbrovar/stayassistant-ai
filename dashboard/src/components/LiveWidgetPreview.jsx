import { useEffect } from "react"

export default function LiveWidgetPreview({ propertyId, refresh }) {

    useEffect(() => {
        if (!propertyId) return

        // limpiar widget anterior
        // eliminar script anterior
        const existingScript = document.getElementById("stayassistant-widget")
        if (existingScript) existingScript.remove()

        // eliminar iframe previo
        const existingIframe = document.querySelector("iframe[src*='chat.html']")
        if (existingIframe) existingIframe.remove()

        // eliminar botón previo
        const existingButton = document.querySelector("button")
        if (existingButton && existingButton.innerText.includes("Concierge")) {
            existingButton.remove()
        }

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

        document.body.appendChild(script)

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