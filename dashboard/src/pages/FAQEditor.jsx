import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"
import { API_URL } from "../api/config"

export default function FAQEditor() {

    const propertyId = getPropertyId()

    const [faq, setFaq] = useState([])

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

        await fetch(`${API_URL}/property/${propertyId}/faq`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },

            body: JSON.stringify({ faq })

        })

        alert("FAQ saved")

    }


    return (

        <div>

            <h2>FAQ</h2>
            

            <Card>

                {faq.map((item, index) => (

                    <div key={index} className="faq-row">

                        <input
                            value={item.question}
                            onChange={(e) => updateQuestion(index, e.target.value)}
                            placeholder="Question"
                        />

                        <input
                            value={item.answer}
                            onChange={(e) => updateAnswer(index, e.target.value)}
                            placeholder="Answer"
                        />

                        <button onClick={() => removeFaq(index)}>
                            Delete
                        </button>

                    </div>

                ))}

                <button onClick={addFaq}>
                    Add Question
                </button>

                <button onClick={save}>
                    Save FAQ
                </button>

            </Card>

        </div>

    )

}
