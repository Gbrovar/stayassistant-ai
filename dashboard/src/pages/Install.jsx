import { getPropertyId } from "../api/auth"
import Card from "../components/Card"
import CopyButton from "../components/CopyButton"
import { API_URL } from "../api/config"
import { useEffect, useState } from "react"
import Button from "../components/UI/Button"

export default function Install() {

    const [copied, setCopied] = useState(() => {
        return localStorage.getItem("install_copied") === "true"
    })

    const [tested, setTested] = useState(() => {
        return localStorage.getItem("install_tested") === "true"
    })

    const [siteUrl, setSiteUrl] = useState("")
    const [detected, setDetected] = useState(null)
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem("property_url")
        if (saved) setSiteUrl(saved)
    }, [])

    useEffect(() => {
        if (siteUrl) {
            checkInstallation()
        }
    }, [siteUrl])

    async function checkInstallation() {
        if (!siteUrl) return

        try {
            setChecking(true)

            const res = await fetch(siteUrl)
            const html = await res.text()

            if (html.includes("stayassistantai.com/widget.js")) {
                setDetected(true)
                setTested(true)
                localStorage.setItem("install_tested", "true")
            } else {
                setDetected(false)
            }

        } catch (e) {
            setDetected(false)
        } finally {
            setChecking(false)
        }
    }

    const propertyId = getPropertyId()

    const script = `<script src="https://stayassistantai.com/widget.js?property=${propertyId}" defer></script>`

    const stepsCompleted = (copied ? 1 : 0) + ((tested || detected) ? 1 : 0)

    return (

        <div className="container">

            {/* 🔥 HEADER UNIFICADO */}
            <div className="page-header">

                <div className="install-header-top">
                    <div className="page-header">
                        <div className="install-title">
                            Install your AI concierge
                        </div>
                        <div className="install-subtitle">
                            Takes less than 2 minutes
                        </div>
                    </div>

                    <div className="install-progress">
                        {stepsCompleted} / 2
                    </div>
                </div>

                <div className="install-status">
                    {detected === true && "🟢 Live on your website"}
                    {detected === false && "⚠️ Not detected yet"}
                    {detected === null && "Ready to install"}
                </div>

            </div>

            <div className="stack">

                {/* STEP 1 */}
                <Card className="install-primary-step">

                    <div className="install-step-header">
                        <span className={`step-dot ${copied ? "done" : ""}`}></span>
                        <strong>Step 1 — Copy your widget</strong>
                    </div>

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
                        onClick={() => {
                            setCopied(true)
                            localStorage.setItem("install_copied", "true")
                        }}
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

                    {copied && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "#22c55e" }}>
                            Copied ✓ Now paste it into your website
                        </div>
                    )}

                </Card>

                {/* STEP 2 */}
                <Card>

                    <div className="install-step-header">
                        <span className={`step-dot ${copied ? "done" : ""}`}></span>
                        <strong>Step 2 — Add to your website</strong>
                    </div>

                    <p className="subtitle">
                        Paste it before the closing <code>{"</body>"}</code> tag
                    </p>

                    <p>
                        Open your website HTML and paste the script before the closing
                        <code>{" </body> "}</code>.
                    </p>

                    <div className="install-hint">
                        Paste before &lt;/body&gt;
                    </div>

                    <pre className="install-code">
                        {`<body>

    ... your website ...

    ${script}

</body>`}
                    </pre>

                </Card>

                {/* STEP 3 */}
                <Card>

                    <div className="install-step-header">
                        <span className={`step-dot ${(tested || detected) ? "done" : ""}`}></span>
                        <strong>Step 3 — Test your AI concierge</strong>
                    </div>

                    <p className="subtitle">
                        Open a live preview and see how guests interact
                    </p>

                    <input
                        className="input"
                        type="text"
                        placeholder="https://yourwebsite.com"
                        value={siteUrl}
                        onChange={(e) => {
                            setSiteUrl(e.target.value)
                            localStorage.setItem("property_url", e.target.value)
                        }}
                    />

                    <div className="install-step-input-block">

                        {checking && "Checking installation..."}
                        {!checking && detected === true && "✅ Widget detected"}
                        {!checking && detected === false && (
                            <div style={{ fontSize: 12, color: "#f59e0b" }}>
                                Could not detect automatically. Open your site manually.
                            </div>
                        )}

                    </div>

                    <Button
                        variant="primary"
                        onClick={async () => {

                            setTested(true)
                            localStorage.setItem("install_tested", "true")

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
                    </Button>

                </Card>

                {/* CHECK BUTTON EXTRA */}
                <div className="install-check-wrapper">

                    <Button
                        variant={detected ? "primary" : "secondary"}
                        onClick={checkInstallation}
                        disabled={checking}
                    >
                        {checking ? "Checking..." : "Check installation"}
                    </Button>

                </div>

            </div>

        </div>

    )

}