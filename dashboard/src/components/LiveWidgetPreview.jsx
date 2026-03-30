import { useEffect, useState } from "react"

export default function LiveWidgetPreview({ propertyId, refresh }) {

    const [url, setUrl] = useState("")

    useEffect(() => {
        const base = import.meta.env.VITE_API_URL || window.location.origin

        setUrl(
            `${base}/chat.html?preview=true&property=${propertyId}&t=${Date.now()}`
        )
    }, [propertyId, refresh])

    return (
        <div style={{
            position: "relative",
            width: "100%",
            height: 600,
            borderRadius: 16,
            overflow: "hidden",
            background: "#0b1220"
        }}>

            {/* Fondo fake web */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "#0b1220"
            }} />

            {/* Widget real */}
            <iframe
                src={url}
                style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "100%",
                    height: "100%",
                    border: "none"
                }}
            />

        </div>
    )
}