import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"
import Button from "../components/UI/Button"

export default function Recommendations({ onComplete }) {

    const propertyId = getPropertyId()

    const [items, setItems] = useState([])

    const { setRefreshPreview, showToast } = useContext(AppContext)

    const [saving, setSaving] = useState(false)

    useEffect(() => {

        async function load() {

            const res = await fetch(`${API_URL}/property/${propertyId}/recommendations`, {
                headers: {
                    "Authorization": "Bearer " + getToken()
                }
            })

            const data = await res.json()

            setItems(
                (data.recommendations || []).map(r =>
                    typeof r === "string"
                        ? { name: r, description: "" }
                        : r
                )
            )

        }

        load()

    }, [])

    useEffect(() => {

        function handleAutoFill(e) {

            const data = e.detail

            if (!data?.recommendations) return

            setItems(
                data.recommendations.map(r =>
                    typeof r === "string"
                        ? { name: r, description: "" }
                        : r
                )
            )

        }

        window.addEventListener("ai-autofill", handleAutoFill)

        return () => window.removeEventListener("ai-autofill", handleAutoFill)

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

        setSaving(true)

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

        showToast("Recommendations saved")
        setRefreshPreview(prev => prev + 1)

        setSaving(false)


    }


    return (

        <div>

            <div className="card-v2 card-hero">
                <p className="text-muted">
                    Add local recommendations to improve guest experience and reduce repetitive questions.
                </p>
            </div>

            {items.map((item, index) => (

                <div key={index} className="card-soft-v2 rec-card">

                    <div className="form-group-block">
                        <input className="input"
                            value={item.name}
                            placeholder="Place name"
                            onChange={(e) => updateName(index, e.target.value)}
                        />

                        <input className="input"
                            value={item.description}
                            placeholder="Description"
                            onChange={(e) => updateDescription(index, e.target.value)}
                        />
                    </div>

                    <div className="flex-end  mt-sm">
                        <button className="btn btn-secondary" onClick={() => removeItem(index)}>
                            Delete
                        </button>
                    </div>

                </div>

            ))}

            <div className="flex-between mt-md">
                <div className="flex gap-sm">

                    <Button className="btn btn-md btn-primary" onClick={addItem}>
                        + Add recommendation
                    </Button>

                    <Button className="btn btn-md btn-primary" onClick={save}>
                        {saving ? "Saving..." : "Save"}
                    </Button>

                </div>
            </div>

            <div className="flex-end mt-md">
                <Button
                    className="btn btn-md btn-primary"
                    onClick={async () => {
                        await save()
                        if (onComplete) onComplete()
                    }}
                >
                    Finish setup →
                </Button>
            </div>

        </div>

    )

}