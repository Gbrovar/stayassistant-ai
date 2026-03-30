import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getPropertyId, getToken } from "../api/auth"
import { API_URL } from "../api/config"
import { Link } from "react-router-dom"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"


export default function Preview() {

  const propertyId = getPropertyId()

  const [widgetInstalled, setWidgetInstalled] = useState(true)

  const [refreshKey, setRefreshKey] = useState(0)

  const { refreshPreview } = useContext(AppContext)

  const previewUrl =
    `${window.location.origin}/chat.html?embed=true&property=${propertyId}`

  useEffect(() => {

    async function loadStatus() {

      const res = await fetch(`${API_URL}/onboarding/status`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })

      const data = await res.json()

      setWidgetInstalled(data.widget)

    }

    loadStatus()

  }, [])

  return (

    <div>

      <h2>Preview</h2>

      {!widgetInstalled && (

        <div className="activation-banner">

          ⚠ Install the widget on your website to start assisting guests.

          <Link to="/install">
            <button className="install-btn">
              Install now
            </button>
          </Link>

        </div>

      )}

      <Card>

        {/*    
        <iframe
          src={previewUrl}
          className="preview-frame"
          title="Widget Preview"
        />
      */}

        <iframe
          key={refreshPreview}
          src={previewUrl}
          className="preview-frame"
        />
      </Card>

      <div className="preview-actions">

        <Link to="/assistant">
          <button className="action-btn">
            Customize appearance
          </button>
        </Link>

        <Link to="/install">
          <button className="action-btn">
            Install widget
          </button>
        </Link>

      </div>

    </div>

  )

}