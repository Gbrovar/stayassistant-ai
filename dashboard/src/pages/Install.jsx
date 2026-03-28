import { getPropertyId } from "../api/auth"
import Card from "../components/Card"
import CopyButton from "../components/CopyButton"
import { API_URL } from "../api/config"
import { useEffect } from "react"

export default function Install() {

    const propertyId = getPropertyId()

    const script = `<script src="https://stayassistantai.com/widget.js?property=${propertyId}"></script>`

    return (

        <div className="page">

            <div className="page-header">
                <h1 className="page-title">Install StayAssistant</h1>
                <p className="page-subtitle">
                    Get your AI concierge live in under 2 minutes
                </p>
            </div>

            <div className="stack">

                <Card>

                    <h3>Step 1 — Copy your widget</h3>
                    <p className="subtitle">
                        This is your unique AI concierge script
                    </p>

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

                    <h3>Step 2 — Add to your website</h3>
                    <p className="subtitle">
                        Paste it before the closing <code>{"</body>"}</code> tag
                    </p>

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

                    <h3>Step 3 — Test your AI concierge</h3>
                    <p className="subtitle">
                        Open a live preview and see how guests interact
                    </p>

                    <p>
                        Once installed, open your website and test the concierge.
                    </p>

                    <button className="btn btn-primary"
                        onClick={async () => {

                            const token = localStorage.getItem("token")

                            await fetch(`${API_URL}/onboarding/complete`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    step: "widget"
                                })
                            })

                            window.open(`/chat.html?property=${propertyId}`, "_blank")

                        }}
                    >
                        Open test chat
                    </button>

                </Card>

            </div>

        </div >

    )

}