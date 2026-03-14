import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"

export default function Recommendations() {

    const propertyId = getPropertyId()

    const [items, setItems] = useState([])

    useEffect(() => {

        async function load() {

            const res = await fetch(`${API_URL}/property/${propertyId}/recommendations`, {
                headers: {
                    "Authorization": "Bearer " + getToken()
                }
            })

            const data = await res.json()

            setItems(data.recommendations || [])

        }

        load()

    }, [])


    function updateName(index, value) {

        const copy = [...items]

        copy[index].name = value

        setItems(copy)

    }


    function updateDescription(index, value) {

        const copy = [...items]

        copy[index].description = value

        setItems(copy)

    }


    function addItem() {

        setItems([
            ...items,
            { name: "", description: "" }
        ])

    }


    function removeItem(index) {

        const copy = [...items]

        copy.splice(index, 1)

        setItems(copy)

    }


    async function save() {

        await fetch(`${API_URL}/property/${propertyId}/recommendations`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },

            body: JSON.stringify({
                recommendations: items
            })

        })

        alert("Recommendations saved")

    }


    return (

        <div>

            <h1>Local Recommendations</h1>

            <Card>

                {items.map((item, index) => (

                    <div key={index} className="rec-row">

                        <input
                            value={item.name}
                            placeholder="Name"
                            onChange={(e) => updateName(index, e.target.value)}
                        />

                        <input
                            value={item.description}
                            placeholder="Description"
                            onChange={(e) => updateDescription(index, e.target.value)}
                        />

                        <button onClick={() => removeItem(index)}>
                            Delete
                        </button>

                    </div>

                ))}

                <button onClick={addItem}>
                    Add recommendation
                </button>

                <button onClick={save}>
                    Save
                </button>

            </Card>

        </div>

    )

}