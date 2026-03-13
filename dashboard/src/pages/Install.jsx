import { getPropertyId } from "../api/auth"
import Card from "../components/Card"
import CopyButton from "../components/CopyButton"

export default function Install() {

    const propertyId = getPropertyId()

    const script = `<script src="https://stayassistantai.com/widget.js?property=${propertyId}"></script>`

    return (

        <div>

            <h1>Install StayAssistant</h1>

            <Card>

                <p>
                    Copy and paste this script into your website before the closing
                    <code>{" </body> "}</code> tag.
                </p>

                <pre className="install-code">
                    {script}
                </pre>

                <CopyButton text={script} />

            </Card>

        </div>

    )

}