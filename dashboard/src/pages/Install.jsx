import { getPropertyId } from "../api/auth"
import Card from "../components/Card"
import CopyButton from "../components/CopyButton"
import { API_URL } from "../api/config"
import { useEffect } from "react"

export default function Install() {

    useEffect(() => {

        const token = localStorage.getItem("token")

        fetch(`${API_URL}/onboarding/complete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                step: "widget"
            })
        })

    }, [])

    const propertyId = getPropertyId()

    const script = `<script src="https://stayassistantai.com/widget.js?property=${propertyId}"></script>`

    return (

        <div>

            <h1>Install StayAssistant</h1>

            <Card>

                <h3>Step 1 — Copy script</h3>

                <p>
                    Copy this script and paste it into your website before the closing
                    <code>{" </body> "}</code> tag.
                </p>

                <pre className="install-code">
                    {script}
                </pre>

                <CopyButton
                    text={script}
                    onCopy={() => {

                        const token = localStorage.getItem("token")

                        fetch(`${API_URL}/onboarding/complete`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                step: "widget"
                            })
                        })

                    }}
                />

            </Card>


            <Card>

                <h3>Step 2 — Install on your website</h3>

                <p>
                    Open your website HTML and paste the script before the closing
                    <code>{" </body> "}</code>.
                </p>

                <pre className="install-code">
                    {`<body>

                    ... your website ...

                    ${script}

                    </body>`}
                </pre>

            </Card>


            <Card>

                <h3>Step 3 — Test your assistant</h3>

                <p>
                    Once installed, open your website and test the concierge.
                </p>

                <button
                    onClick={() =>
                        window.open(`/chat.html?property=${propertyId}`, "_blank")
                    }
                >
                    Open test chat
                </button>

            </Card>

        </div>

    )

}