import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectRedis } from "./db/redis.js"
import OpenAI from "openai";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticate } from "./authMiddleware.js";
import { fileURLToPath } from "url";
import { createClient } from "redis";
import { users } from "./users.js"
import { properties } from "./properties.js";
import { buildPrompt } from "./promptBuilder.js";

//import { createUser, getUser } from "./db/users.js"
//import { createProperty, getProperty } from "./db/properties.js"

/******* *********** */

dotenv.config();

const app = express();

/* --- DISTANCE HELPER --- */

function getDistance(lat1, lon1, lat2, lon2) {

  const R = 6371

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c

}

/* --- middleware --- */

app.use(cors());
app.use(express.json());

/* --- paths --- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.resolve(__dirname, "../public");

console.log("Serving static files from:", publicPath);


/* --- static files --- */

app.use(express.static(publicPath));

/* --- health check --- */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


app.get("/property/:id/suggestions", (req, res) => {

  const propertyId = req.params.id;
  const language = req.query.lang || "English";

  const property = properties[propertyId];

  if (!property) {
    return res.json({ suggestions: [] });
  }

  const faq = property.knowledge.faq.slice(0, 2);
  const services = property.knowledge.services.slice(0, 2);

  const suggestions = [];

  faq.forEach(f => {

    suggestions.push({
      label: translateSuggestion(f.question, language),
      value: f.question
    });

  });

  services.forEach(s => {

    suggestions.push({
      label: translateSuggestion(s, language),
      value: s
    });

  });

  res.json({ suggestions });

});


/* GOOGLE PLACES SUGGESTIONS */
app.get("/property/:id/places/:type", async (req, res) => {

  const propertyId = req.params.id;
  const type = req.params.type;

  const property = properties[propertyId];

  if (!property || !property.coordinates) {
    return res.json({ items: [] });
  }

  const { lat, lng } = property.coordinates;

  const cacheKey = `places:${propertyId}:${type}`;

  /* --- REDIS CACHE --- */

  const cached = await redis.get(cacheKey);

  if (cached) {

    console.log("Places cache hit");

    return res.json(JSON.parse(cached));

  }

  /* --- CATEGORY MAP --- */

  const mapType = {

    restaurants: "restaurant",

    cafes: "cafe",

    bars: "bar",

    activities: "tourist_attraction",

    parks: "park",

    supermarket: "supermarket",

    pharmacy: "pharmacy",

    transport: "taxi_stand",

    public_transport: "transit_station"

  };

  const placeType = mapType[type];

  if (!placeType) {
    return res.json({ items: [] });
  }

  try {

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${placeType}&key=${process.env.GOOGLE_PLACES_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    const items = data.results.slice(0, 4).map(place => {

      let distance = null

      if (place.geometry?.location) {

        distance = Math.round(
          getDistance(
            lat,
            lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          ) * 1000
        )

      }

      return {

        name: place.name,

        rating: place.rating || "4+",

        address: place.vicinity,

        distance: distance,

        place_id: place.place_id,

        open: place.opening_hours?.open_now ?? null

      }

    });

    const result = { items };

    /* --- SAVE CACHE 24H --- */

    await redis.set(cacheKey, JSON.stringify(result), {

      EX: 60 * 60 * 24

    });

    console.log("Places cache saved");

    res.json(result);

  } catch (error) {

    console.error("Places API error", error);

    res.json({ items: [] });

  }

});

function translateSuggestion(text, language) {

  const translations = {

    Español: {
      "How do I open the smart lock?": "¿Cómo abro la cerradura inteligente?",
      "Where can I leave the trash?": "¿Dónde puedo tirar la basura?",
      "Can I store luggage after checkout?": "¿Puedo guardar el equipaje después del checkout?",
      "Airport transfer service": "Servicio de traslado al aeropuerto",
      "Bike rental near the beach": "Alquiler de bicicletas cerca de la playa"
    },

    Deutsch: {
      "How do I open the smart lock?": "Wie öffne ich das Smart Lock?",
      "Where can I leave the trash?": "Wo kann ich den Müll entsorgen?",
      "Can I store luggage after checkout?": "Kann ich mein Gepäck nach dem Checkout lagern?",
      "Airport transfer service": "Flughafentransfer",
      "Bike rental near the beach": "Fahrradverleih in Strandnähe"
    }

  };

  return translations[language]?.[text] || text;

}

/* --- root route --- */

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* --- OpenAI client --- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* --- Redis client --- */

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", (err) => console.error("Redis error", err));

await redis.connect();

console.log("Redis connected successfully");

/* --- property config endpoint --- */

app.get("/property/:id", (req, res) => {

  const propertyId = req.params.id;

  const property = properties[propertyId] || properties["demo_property"];

  res.json({
    id: property.id,
    name: property.name,
    branding: property.branding
  });

});

/* --- LOGIN --- */

app.post("/auth/login", async (req, res) => {

  const { email, password } = req.body

  const user = Object.values(users).find(u => u.email === email)

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const valid = password === "test123"

  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const token = jwt.sign(
    { propertyId: user.propertyId },
    process.env.JWT_SECRET || "stayassistant_secret",
    { expiresIn: "7d" }
  )

  res.json({
    token,
    propertyId: user.propertyId
  })

});

/* --- REGISTER PROPERTY --- */

app.post("/auth/register", async (req, res) => {

  const { property_name, email, password } = req.body

  if (!property_name || !email || !password) {
    return res.status(400).json({ error: "missing fields" })
  }

  const propertyId = "property_" + Date.now()

  properties[propertyId] = {

    id: propertyId,

    name: property_name,

    coordinates: {
      lat: 0,
      lng: 0
    },

    branding: {
      button_text: "Ask concierge",
      primary_color: "#22c55e"
    },

    knowledge: {
      property_info: {
        checkin: "15:00",
        checkout: "11:00"
      },

      faq: [],

      services: [],

      local_recommendations: []
    }

  }

  users[propertyId] = {

    email,
    password,
    propertyId

  }

  await createProperty(properties[propertyId])

  await createUser({
    email,
    password,
    propertyId
  })

  const token = jwt.sign(
    { propertyId },
    process.env.JWT_SECRET || "stayassistant_secret",
    { expiresIn: "7d" }
  )

  res.json({
    token,
    propertyId
  })

});

/* --- GET FAQ --- */

app.get("/property/:id/faq", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = properties[propertyId]

  if (!property) {
    return res.json({ faq: [] })
  }

  res.json({
    faq: property.knowledge.faq
  })

});

/* --- UPDATE FAQ --- */

app.post("/property/:id/faq", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { faq } = req.body

  const property = properties[propertyId]

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.knowledge.faq = faq

  res.json({
    success: true
  })

});

/* --- GET BRANDING --- */

app.get("/property/:id/branding", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = properties[propertyId]

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  res.json({
    property_name: property.name,
    button_text: property.branding?.button_text || "Ask concierge",
    primary_color: property.branding?.primary_color || "#22c55e"
  })

});

/* --- UPDATE BRANDING --- */

app.post("/property/:id/branding", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { property_name, button_text, primary_color } = req.body

  const property = properties[propertyId]

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.name = property_name

  property.branding = {
    button_text,
    primary_color
  }

  res.json({
    success: true
  })

});


/* --- GET RECOMMENDATIONS --- */

app.get("/property/:id/recommendations", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = properties[propertyId]

  if (!property) {
    return res.json({ recommendations: [] })
  }

  res.json({
    recommendations: property.knowledge.local_recommendations
  })

});


/* --- UPDATE RECOMMENDATIONS --- */

app.post("/property/:id/recommendations", authenticate, (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { recommendations } = req.body

  const property = properties[propertyId]

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.knowledge.local_recommendations = recommendations

  res.json({
    success: true
  })

});



/* --- deteccion y adaptacion de intent --- */
function detectIntent(text) {

  text = text.toLowerCase()

  if (
    text.includes("wifi")
  ) return "wifi"

  if (
    text.includes("restaurant") ||
    text.includes("food") ||
    text.includes("eat") ||
    text.includes("dinner")
  ) return "restaurants"

  if (
    text.includes("supermarket") ||
    text.includes("grocery") ||
    text.includes("market") ||
    text.includes("supermercado")
  ) return "supermarket"

  if (
    text.includes("taxi") ||
    text.includes("uber")
  ) return "taxi"

  if (
    text.includes("check in") ||
    text.includes("check-in")
  ) return "checkin"

  if (
    text.includes("check out") ||
    text.includes("checkout")
  ) return "checkout"

  if (
    text.includes("pharmacy") ||
    text.includes("farmacia")
  ) return "pharmacy"

  if (
    text.includes("bus") ||
    text.includes("metro") ||
    text.includes("train")
  ) return "transport"

  if (
    text.includes("activity") ||
    text.includes("things to do")
  ) return "activities"

  return "other"

}

/* --- chat endpoint --- */

app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message || "";
    const userLanguage = req.body.language || null;
    const conversationId = req.body.conversationId || "default";
    const propertyId = req.body.propertyId || "demo_property";
    const hour = req.body.hour || null;

    /* --- ANALYTICS TRACKING --- */

    try {

      const analyticsKey = `stayassistant:analytics:${propertyId}:questions`;

      const intent = detectIntent(userMessage)

      await redis.zIncrBy(
        analyticsKey,
        1,
        intent
      )

    } catch (err) {

      console.log("Analytics error:", err);

    }

    console.log("Property:", propertyId);

    const property = properties[propertyId] || properties["demo_property"];

    if (!property) {
      return res.json({
        reply: "Property configuration not found."
      });
    }

    const historyKey = `stayassistant:chat:${propertyId}:${conversationId}`;

    let history = await redis.get(historyKey);

    history = history ? JSON.parse(history) : [];

    history.push({
      role: "user",
      content: userMessage
    });

    const normalizedMessage = userMessage.toLowerCase();

    /* --- CHECKIN / CHECKOUT SMART FAQ --- */

    if (

      normalizedMessage.includes("check in") ||
      normalizedMessage.includes("check-in") ||
      normalizedMessage.includes("checkin") ||

      normalizedMessage.includes("check out") ||
      normalizedMessage.includes("checkout") ||
      normalizedMessage.includes("check-out") ||

      normalizedMessage.includes("arrival") ||
      normalizedMessage.includes("departure") ||

      normalizedMessage.includes("llegada") ||
      normalizedMessage.includes("salida") ||

      normalizedMessage.includes("checkin") ||
      normalizedMessage.includes("checkout")

    ) {

      let answer = `
      Check-in: ${property.knowledge.property_info.checkin}

      Check-out: ${property.knowledge.property_info.checkout}
      `

      /* traducir si idioma ≠ inglés */

      if (userLanguage && userLanguage !== "English") {

        const translation = await openai.chat.completions.create({

          model: "gpt-4o-mini",

          messages: [
            {
              role: "system",
              content: `Translate the following text to ${userLanguage}. Only return the translated text.`
            },
            {
              role: "user",
              content: answer
            }
          ]

        })

        answer = translation.choices[0].message.content

      }

      return res.json({
        reply: answer,
        language: userLanguage
      })

    }

    /* --- FAQ AUTO ANSWER --- */

    const faqMatch = property.knowledge.faq.find(f =>
      normalizedMessage.includes(f.question.toLowerCase())
    );

    if (faqMatch) {

      console.log("FAQ auto-answer triggered");

      let answer = faqMatch.answer;

      // traducir si el usuario no usa inglés
      if (userLanguage && userLanguage !== "English") {

        const translation = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Translate the following text to ${userLanguage}. Only return the translated text.`
            },
            {
              role: "user",
              content: answer
            }
          ]
        });

        answer = translation.choices[0].message.content;

      }

      history.push({
        role: "assistant",
        content: answer
      });

      await redis.set(historyKey, JSON.stringify(history), {
        EX: 60 * 60 * 6
      });

      return res.json({
        reply: answer,
        language: userLanguage
      });

    }

    const context = detectContext(hour);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildPrompt(property, userLanguage, context)
        },

        ...history

      ]
    });

    const reply = completion.choices[0].message.content;

    let detectedLanguage = userLanguage;

    if (!detectedLanguage) {

      const match = reply.match(/LANGUAGE:\s*(English|Español|Deutsch)/i);

      if (match) {
        detectedLanguage = match[1];
      }

    }

    const cleanReply = reply.replace(/LANGUAGE:\s*(English|Español|Deutsch)/i, "").trim();

    history.push({
      role: "assistant",
      content: cleanReply
    });

    if (history.length > 10) {
      history = history.slice(-10);
    }

    await redis.set(historyKey, JSON.stringify(history), {
      EX: 60 * 60 * 6
    });

    res.json({
      reply: cleanReply,
      language: detectedLanguage
    });

  } catch (error) {

    console.error("OpenAI error:", error);

    res.status(500).json({
      reply: "Sorry, something went wrong."
    });

  }

});

/* -- CONTEXT DETECTION --- */
function detectContext(hour) {

  if (!hour) return "day"

  if (hour >= 22 || hour <= 5)
    return "night"

  if (hour >= 6 && hour <= 11)
    return "morning"

  if (hour >= 12 && hour <= 18)
    return "afternoon"

  return "evening"

}


/* --- ANALYTICS API --- */

app.get("/analytics/:propertyId", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId;

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const key = `stayassistant:analytics:${propertyId}:questions`;

    const data = await redis.zRangeWithScores(
      key,
      0,
      9,
      { REV: true }
    );

    const results = data.map(item => ({
      question: item.value,
      count: item.score
    }));

    res.json({
      top_questions: results
    });

  } catch (err) {

    console.error("Analytics error", err);

    res.status(500).json({
      error: "Analytics failed"
    });

  }

});


/* --- server port --- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});