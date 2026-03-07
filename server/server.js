import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/* --- middleware --- */

app.use(cors());
app.use(express.json());

/* --- paths --- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.resolve(__dirname, "../public");

console.log("Serving static files from:", publicPath);

/* --- servir archivos estáticos --- */

app.use(express.static(publicPath));

/* --- health check (importante para Railway) --- */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* --- root route --- */

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* --- OpenAI client --- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* --- chat endpoint --- */

app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message || "";
    const language = req.body.language || "English";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are StayAssistant AI.

You are a professional virtual concierge for vacation rental guests.

Your job is to help guests with information about the accommodation, services, and local recommendations.

Always respond in a friendly, clear and helpful tone.

IMPORTANT:

The guest has selected this language: ${language}

Always answer in this language.
Never change language even if the guest writes in another language.

If you don't know the answer, politely suggest contacting reception.

----------------------------------

PROPERTY INFORMATION

Property name: Ocean View Apartments
Location: Las Palmas de Gran Canaria

Type: Holiday apartment building
Total apartments: 12 units

----------------------------------

CHECK-IN / CHECK-OUT

Check-in: from 15:00
Check-out: before 11:00

Early check-in: subject to availability.

Late check-in:
Guests arriving after 22:00 can use the self check-in system with a smart lock.
Instructions are sent automatically on the day of arrival.

----------------------------------

RECEPTION

Reception hours:
08:00 – 20:00 daily

Phone: +34 600 000 000

Outside reception hours guests can contact the emergency number.

----------------------------------

CLEANING

Cleaning schedule:
Apartments are cleaned every 3 days for stays longer than 5 nights.

Fresh towels available upon request.

Final cleaning is included in the reservation.

----------------------------------

FOOD & DRINK

Breakfast: not included.

Nearby breakfast options:
- Café Regina
- Granier Bakery
- Mercado del Puerto

There is no restaurant inside the building.

----------------------------------

BAR

There is no bar on the property.

Nearby bars:
- La Azotea Rooftop Bar
- Rocktop Skybar

----------------------------------

WIFI

Wifi network: OceanViewWifi
Password: welcome123

----------------------------------

PARKING

There is no private parking.

Free street parking available nearby.

Paid parking available at:
Parking Las Canteras (5 minutes walk)

----------------------------------

TRANSPORT

Taxi from airport to apartment:
Approx. price: 30–35 €

Bus from airport:
Line 60 to Santa Catalina station.

Bus stop:
3 minutes walking from the apartment.

----------------------------------

NEARBY ATTRACTIONS

Las Canteras beach:
5 minute walk.

El Mercado del Puerto:
Local food market, 8 minute walk.

La Marinera Restaurant:
Popular seafood restaurant near the beach.

Bike rentals available near the beach promenade.

Surf schools available at Las Canteras beach.

----------------------------------

SUPERMARKETS

Nearby supermarkets:

- Spar Las Canteras (2 minute walk)
- Hiperdino Express (5 minute walk)

----------------------------------

HOUSE RULES

No smoking inside the apartment.

No parties allowed.

Quiet hours:
22:00 – 08:00

----------------------------------

EXTRA SERVICES

Taxi service can be arranged.

Food delivery services like Glovo and Uber Eats are available.

Laundry services available nearby.

Luggage storage may be available depending on availability.

----------------------------------

EMERGENCY

Emergency number in Spain: 112

Nearest hospital:
Hospital Universitario de Gran Canaria Doctor Negrín

----------------------------------

Always assist guests politely and clearly.
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