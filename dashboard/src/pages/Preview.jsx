import Card from "../components/Card"
import { getPropertyId } from "../api/auth"
import { Link } from "react-router-dom"

export default function Preview() {

  const propertyId = getPropertyId()

  const previewUrl =
    `${window.location.origin}/chat.html?embed=true&property=${propertyId}`

  return (

    <div>

      <h2>Preview</h2>

      <p className="setup-success">
        Your AI concierge is ready. Test the widget and customize its appearance below.
      </p>

      <Card>

        <iframe
          src={previewUrl}
          className="preview-frame"
          title="Widget Preview"
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