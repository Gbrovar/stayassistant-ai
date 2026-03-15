import Card from "../components/Card"
import { getPropertyId } from "../api/auth"

export default function Preview(){

  const propertyId = getPropertyId()

  const previewUrl =
    `${window.location.origin}/chat.html?embed=true&property=${propertyId}`

  return(

    <div>

      <h1>Widget Preview</h1>

      <Card>

        <iframe
          src={previewUrl}
          className="preview-frame"
          title="Widget Preview"
        />

      </Card>

    </div>

  )

}