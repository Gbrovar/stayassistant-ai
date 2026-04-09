import { getPropertyId } from "../api/auth"
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

        <div className="container stack-lg">

            {/* 🔥 HEADER UNIFICADO */}
            <div className="page-header">

                <div className="flex-between">
                    <div>
                        <div>
                            <h1 className="title-lg">Install your AI concierge</h1>
                            <p className="page-subtitle">Takes less than 2 minutes</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-dashboard">

                <div className="col-8">
                    {/* STEP 1 */}
                    <div className="card-v2 card-hero">

                        <div className="section-title-v2">
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

                                setTimeout(() => {
                                    setCopied(false)
                                }, 1500)

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
                            <div className="mt-sm text-success">
                                Copied ✓ Now paste it into your website
                            </div>
                        )}

                    </div>
                </div>

                <div className="col-4">

                    <div className="card-v2">

                        <div className="section-title-v2">Installation status</div>

                        <p className="text-muted">
                            {stepsCompleted} of 2 steps completed
                        </p>

                        <p className="mt-sm">
                            {detected === true && "🟢 Live on your website"}
                            {detected === false && "⚠️ Not detected yet"}
                            {detected === null && "Ready to install"}
                        </p>

                    </div>

                </div>

                <div className="col-6">
                    {/* STEP 2 */}
                    <div className="card-v2">

                        <div className="section-title-v2">
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

                    </div>
                </div>

                <div className="col-6">
                    {/* STEP 3 */}
                    <div className="card-v2">

                        <div className="section-title-v2">
                            <span className={`step-dot ${(tested || detected) ? "done" : ""}`}></span>
                            <strong>Step 3 — Test your AI concierge</strong>
                        </div>

                        <p className="subtitle">
                            Open a live preview and see how guests interact
                        </p>

                        <div className="form-group-block">
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
                        </div>

                        <div className="install-step-input-block">

                            {checking && "Checking installation..."}
                            {!checking && detected === true && "✅ Widget detected"}


                        </div>

                        <Button
                            className="btn btn-md btn-primary"
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

                    </div>
                </div>

                <div className="col-12">
                    {/* CHECK BUTTON EXTRA */}
                    <div className="install-check-wrapper">

                        <Button
                            className="btn btn-secondary btn-full"
                            variant={detected ? "primary" : "secondary"}
                            onClick={checkInstallation}
                            disabled={checking}
                        >
                            {checking ? "Checking..." : "Check installation"}
                        </Button>
                    </div>
                </div>
            </div>

        </div>

    )

}