import { useEffect, useState } from "react"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import Toast from "../components/UI/Toast"
import Button from "../components/UI/Button"
import { useContext } from "react"
import { AppContext } from "../context/AppContext"

export default function FAQEditor({ onComplete }) {

    const propertyId = getPropertyId()

    const [faq, setFaq] = useState([])
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const { setRefreshPreview } = useContext(AppContext)

    useEffect(() => {

        async function load() {

            const res = await fetch(`${API_URL}/property/${propertyId}/faq`, {
                headers: {
                    "Authorization": "Bearer " + getToken()
                }
            })

            const data = await res.json()

            setFaq(data.faq || [])

        }

        load()

    }, [])


    function updateQuestion(index, value) {
        const copy = [...faq]
        copy[index].question = value
        setFaq(copy)
    }

    function updateAnswer(index, value) {
        const copy = [...faq]
        copy[index].answer = value
        setFaq(copy)
    }

    function addFaq() {
        setFaq([...faq, { question: "", answer: "" }])
    }

    function removeFaq(index) {
        const copy = [...faq]
        copy.splice(index, 1)
        setFaq(copy)
    }

    async function save() {

        setLoading(true)

        try {

            await fetch(`${API_URL}/property/${propertyId}/faq`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                },

                body: JSON.stringify({ faq })

            })

            setToast("FAQ saved successfully")
            setRefreshPreview(prev => prev + 1)

        } catch (err) {

            setToast("Error saving FAQ")

        }

        setLoading(false)

    }

    return (

        <div>
            <div className="card card-highlight">
                <p className="text-muted">
                    These questions train your AI concierge.
                    Add the most common things guests ask.
                </p>
            </div>



            {faq.length === 0 && (
                <div style={{
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#94a3b8"
                }}>
                    Start by adding common questions like check-in time or WiFi.
                </div>
            )}

            {faq.map((item, index) => (

                <div key={index} className="faq-card">

                    <div style={{ marginBottom: 8, fontSize: 12, color: "#64748b" }}>
                        Question
                    </div>

                    <input
                        className="input"
                        value={item.question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        placeholder="What time is check-in?"
                    />

                    <div style={{ marginTop: 10, marginBottom: 8, fontSize: 12, color: "#64748b" }}>
                        AI Answer
                    </div>

                    <textarea
                        className="input"
                        value={item.answer}
                        onChange={(e) => updateAnswer(index, e.target.value)}
                        placeholder="Check-in starts at 3pm..."
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                        <Button variant="secondary" onClick={() => removeFaq(index)}>
                            Delete
                        </Button>
                    </div>

                </div>

            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>

                <Button onClick={addFaq}>
                    + Add question
                </Button>

                <Button onClick={save}>
                    {loading ? "Saving..." : "Save FAQ"}
                </Button>

            </div>

            <div style={{ marginTop: 16 }}>
                <Button
                    variant="primary"
                    onClick={() => {
                        if (onComplete) onComplete()
                    }}
                >
                    Continue →
                </Button>
            </div>

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        </div>

    )
}