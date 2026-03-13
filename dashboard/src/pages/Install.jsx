import Card from "../components/Card"
import CopyButton from "../components/CopyButton"

export default function Install(){

  const propertyId = "demo_property"

  const script = `<script src="https://stayassistantai.com/widget.js?property=${propertyId}"></script>`

  return(

    <div>

      <h1>Install Widget</h1>

      <Card>

        <p>Copy and paste this script into your website:</p>

        <pre className="install-script">
          {script}
        </pre>

        <CopyButton text={script} />

      </Card>

    </div>

  )

}