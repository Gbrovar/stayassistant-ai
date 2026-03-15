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