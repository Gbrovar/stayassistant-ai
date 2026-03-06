import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* --- Fix importante para Railway paths --- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* servir carpeta public */

const publicPath = path.resolve(__dirname, "../public");

app.use(express.static(publicPath));

/* ruta raíz */

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/health", (req, res) => {
  res.send("OK");
});

/* --- OpenAI --- */

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

    console.error("OpenAI error:", error);

    res.status(500).json({
      reply: "Sorry, something went wrong."
    });

  }

});

/* --- puerto Railway --- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});