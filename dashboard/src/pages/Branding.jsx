import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"


export default function Branding() {

    const propertyId = getPropertyId()

    const [propertyName, setPropertyName] = useState("")
    const [buttonText, setButtonText] = useState("")
    const [primaryColor, setPrimaryColor] = useState("")

    useEffect(() => {

        async function load() {

            const res = await fetch(`${API_URL}/property/${propertyId}/branding` , {
                headers: {
                    "Authorization": "Bearer " + getToken()
                }
            })

            const data = await res.json()

            setPropertyName(data.property_name)
            setButtonText(data.button_text)
            setPrimaryColor(data.primary_color)

        }

        load()

    }, [])


    async function save() {

        await fetch(`${API_URL}/property/${propertyId}/branding` , {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },

            body: JSON.stringify({
                property_name: propertyName,
                button_text: buttonText,
                primary_color: primaryColor
            })

        })

        alert("Branding saved")

    }


    return (

        <div>

            <h1>Branding</h1>

            <Card>

                <div className="branding-field">

                    <label>Property name</label>

                    <input
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                    />

                </div>


                <div className="branding-field">

                    <label>Widget button text</label>

                    <input
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                    />

                </div>


                <div className="branding-field">

                    <label>Primary color</label>

                    <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                    />

                </div>

                <button className="save-btn" onClick={save}>
                    Save
                </button>

            </Card>

        </div>

    )

}