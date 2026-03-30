import { useEffect, useState } from "react"

export default function LiveWidgetPreview({ propertyId, refresh }) {

  const [url, setUrl] = useState("")

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || window.location.origin

    setUrl(
      `${base}/chat.html?embed=true&preview=true&property=${propertyId}&t=${Date.now()}`
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

      <iframe
        src={url}
        style={{
          width: "100%",
          height: "100%",
          border: "none"
        }}
      />

    </div>
  )
}