import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"
import Toast from "../components/UI/Toast"

export default function FAQEditor() {

    const propertyId = getPropertyId()

    const [faq, setFaq] = useState([])
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)

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

        setFaq([
            ...faq,
            { question: "", answer: "" }
        ])

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

        } catch (err) {

            setToast("Error saving FAQ")

        }

        setLoading(false)

    }

    return (

        <div>

            <h2>FAQ</h2>


            <Card>

                {faq.map((item, index) => (

                    <div className="card" style={{ marginBottom: 12 }}>

                        <input
                            className="input"
                            value={item.question}
                            onChange={(e) => updateQuestion(index, e.target.value)}
                            placeholder="Question"
                        />

                        <textarea
                            className="input"
                            value={item.answer}
                            onChange={(e) => updateAnswer(index, e.target.value)}
                            placeholder="Answer"
                        />

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>

                            <button className="btn btn-secondary">
                                Delete
                            </button>

                        </div>

                    </div>

                ))}

                <button className="btn btn-primary" onClick={addFaq}>
                    Add Question
                </button>

                <button className="btn btn-primary" onClick={save} disabled={loading}>
                    {loading ? "Saving..." : "Save FAQ"}
                </button>

            </Card>

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        </div>



    )

}
