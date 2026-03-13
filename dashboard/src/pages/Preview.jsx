import Card from "../components/Card"

export default function Preview(){

  const propertyId="demo_property"

  const previewUrl = `http://localhost:3000/chat.html?embed=true&property=${propertyId}`

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