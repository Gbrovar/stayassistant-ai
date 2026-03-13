import { useEffect, useState } from "react"
import Card from "../components/Card"
import { getToken, getPropertyId } from "../api/auth"

export default function FAQEditor() {

    const propertyId = getPropertyId()

    const [faq, setFaq] = useState([])

    useEffect(() => {

        async function load() {

            const res = await fetch(`http://localhost:3000/property/${propertyId}/faq`, {
                headers: {
                    "Authorization": "Bearer " + getToken()
                }
            })

            const data = await res.json()

            setFaq(data.faq || [])
            setItems(data.recommendations || [])

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

        await fetch(`http://localhost:3000/property/${propertyId}/faq`, {

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

            <h1>FAQ Editor</h1>

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
