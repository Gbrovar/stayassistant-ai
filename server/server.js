import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;

  try {

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [

        {
          role: "system",
          content: `
You are StayAssistant AI.

You are a virtual concierge for vacation rental guests.

Help guests with questions about:

- check-in
- wifi
- parking
- restaurants nearby
- transport
- local recommendations

Example apartment information:

Apartment name: Ocean View Apartment
Location: Las Palmas de Gran Canaria

Check-in: from 15:00
Check-out: before 11:00

Wifi network: OceanViewWifi
Wifi password: welcome123

Parking: free street parking available.

Nearby recommendations:
- La Marinera (seafood restaurant)
- El Mercado del Puerto (local food)
- Las Canteras beach (5 minute walk)

Always respond in a friendly and helpful tone.
`
        },

        {
          role: "user",
          content: userMessage
        }

      ]
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });

  } catch (error) {

    console.error(error);
    res.json({ reply: "Sorry, something went wrong." });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});