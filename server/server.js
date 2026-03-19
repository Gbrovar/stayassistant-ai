import "dotenv/config"

import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { authenticate } from "./authMiddleware.js";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { properties } from "./properties.js";
import { buildPrompt } from "./promptBuilder.js";
import { createUser, getUser } from "./db/users.js";
import { createProperty, getProperty } from "./db/properties.js";
import redis, { connectRedis } from "./db/redis.js";
import { selectKnowledge } from "./utils/knowledgeSelector.js";
import { detectIntent } from "./utils/intentEngine.js"
import crypto from "crypto";

async function invalidateAnalyticsCache(propertyId) {

  const keys = [
    `stayassistant:ai_insights:${propertyId}`,
    `stayassistant:semantic:${propertyId}`,
    `stayassistant:conversation_score:${propertyId}`,
    `stayassistant:faq_ai:${propertyId}`
  ]

  try {
    if (keys.length) {
      await redis.del(keys)
      console.log("🧹 Cache invalidated:", propertyId)
    }
  } catch (err) {
    console.log("Cache invalidation error:", err)
  }
}

async function shouldRecompute(propertyId) {

  const key = `stayassistant:last_compute:${propertyId}`

  const last = await redis.get(key)

  const now = Date.now()

  const COOLDOWN = 1000 * 60 * 5 // 5 minutos

  if (!last) return true

  return (now - Number(last)) > COOLDOWN
}

async function markRecomputed(propertyId) {

  const key = `stayassistant:last_compute:${propertyId}`

  await redis.set(key, Date.now())
}

async function precomputeInsights(propertyId) {

  try {

    console.log("⚙️ PRECOMPUTE START:", propertyId)

    const listKey = `stayassistant:conversations:${propertyId}`

    const ids = await redis.zRange(listKey, 0, 10, { REV: true }) || []

    if (ids.length === 0) return

    let allMessages = []

    for (const id of ids) {

      const key = `stayassistant:chat:${propertyId}:${id}`

      const history = await redis.get(key)

      if (!history) continue

      try {
        const parsed = JSON.parse(history)

        parsed.forEach(m => {
          if (m.role === "user") {
            allMessages.push(m.content)
          }
        })

      } catch { }
    }

    const sample = allMessages.slice(0, 20).join("\n")

    if (!sample) return

    /* ---------------------------
       SEMANTIC INSIGHTS
    ---------------------------- */

    const semanticPrompt = `
    Analyze these guest messages.

    Detect:
    - confusion
    - repeated questions
    - missing information
    - opportunities to improve FAQ

    Messages:
    ${sample}

    Return 3 short insights.
    `

    const semantic = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      temperature: 0.3,
      messages: [
        { role: "system", content: "You analyze customer conversations." },
        { role: "user", content: semanticPrompt }
      ]
    })

    const semanticInsights = semantic.choices[0].message.content
      .split("\n")
      .filter(line => line.trim().length > 10)

    await redis.set(
      `stayassistant:semantic:${propertyId}`,
      JSON.stringify({ insights: semanticInsights }),
      { EX: 60 * 10 }
    )

    /* ---------------------------
       AI INSIGHTS
    ---------------------------- */

    const intentKey = `stayassistant:analytics:${propertyId}:questions`
    const hourKey = `stayassistant:analytics:${propertyId}:hours`

    const intents = await redis.zRangeWithScores(intentKey, 0, 4, { REV: true })
    const hours = await redis.hGetAll(hourKey)

    const topIntents = intents.map(i => `${i.value} (${i.score})`).join(", ")
    const hourSummary = Object.entries(hours)
      .map(([h, v]) => `${h}:00 (${v})`)
      .join(", ")

    const aiPrompt = `
    Analyze this property data and give 2-3 short business insights.

    Top guest intents:
    ${topIntents}

    Peak hours:
    ${hourSummary}

    Be concise and actionable.
    `

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      temperature: 0.4,
      messages: [
        { role: "system", content: "You analyze SaaS analytics." },
        { role: "user", content: aiPrompt }
      ]
    })

    const aiInsights = ai.choices[0].message.content
      .split("\n")
      .filter(line => line.trim().length > 10)

    await redis.set(
      `stayassistant:ai_insights:${propertyId}`,
      JSON.stringify({ insights: aiInsights }),
      { EX: 60 * 5 }
    )

    /* ---------------------------
       DONE
    ---------------------------- */

    await markRecomputed(propertyId)

    console.log("✅ PRECOMPUTE DONE:", propertyId)

  } catch (err) {

    console.log("Precompute error:", err)

  }
}

const propertyCache = new Map()

async function loadProperty(propertyId) {

  // 1️⃣ memory cache
  if (propertyCache.has(propertyId)) {
    return propertyCache.get(propertyId)
  }

  // 2️⃣ Redis
  let property = await getProperty(propertyId)

  /* FORCE REFRESH IF NO COORDINATES */

  if (
    property &&
    (
      !property.coordinates ||
      !property.address ||
      !property.city
    )
  ) {
    propertyCache.delete(propertyId)
  }

  // 3️⃣ fallback demo property
  if (!property) {
    console.log("❌ PROPERTY NOT FOUND:", propertyId)
    return null
  }

  // 4️⃣ cache result with size protection
  if (property) {

    if (propertyCache.size > 500) {
      propertyCache.clear()
      console.log("Property cache cleared")
    }

    propertyCache.set(propertyId, property)

  }

  return property
}


/* --- GET PROPERTY USAGE LIMIT --- */
async function getUsageLimit(propertyId) {

  const key = `stayassistant:subscription:${propertyId}`

  const sub = await redis.get(key)

  if (!sub) {
    return 100
  }

  const subscription = JSON.parse(sub)

  if (subscription.plan === "pro") return 1500

  if (subscription.plan === "business") return 5000

  return 100

}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
console.log("Stripe loaded:", !!process.env.STRIPE_SECRET_KEY)

await connectRedis();

async function seedDatabase() {

  const demo = await getProperty("demo_property")

  if (!demo) {

    console.log("Seeding demo property")

    await createProperty(properties.demo_property)
    await redis.sAdd("stayassistant:properties", "demo_property")

  }

}

await seedDatabase()


if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable not set")
}

const app = express();

app.set("trust proxy", 1)

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

/* --- chat limiter ---*/

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      reply: "Too many requests. Please wait a moment."
    })
  }

})

/* --- paths --- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.resolve(__dirname, "../public");

console.log("Serving static files from:", publicPath);


/* --- static files --- */

app.use(express.static(publicPath));

/* --- DASHBOARD STATIC (React build) --- */
app.use("/dashboard", express.static(path.join(publicPath, "dashboard")));

/* --- health check --- */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


app.get("/property/:id/suggestions", async (req, res) => {

  const propertyId = req.params.id
  const language = req.query.lang || "English"

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.json({ suggestions: [] })
  }

  const faq = (property.knowledge?.faq || []).slice(0, 2)
  const services = (property.knowledge?.services || []).slice(0, 2)

  const suggestions = []

  faq.forEach(f => {
    suggestions.push({
      label: translateSuggestion(f.question, language),
      value: f.question
    })
  })

  services.forEach(s => {
    suggestions.push({
      label: translateSuggestion(s, language),
      value: s
    })
  })

  res.json({ suggestions })

});


/* GOOGLE PLACES SUGGESTIONS */
app.get("/property/:id/places/:type", async (req, res) => {

  const propertyId = req.params.id;
  const type = req.params.type;

  const property = await loadProperty(propertyId);

  if (!property || !property.coordinates) {
    return res.json({ items: [] });
  }

  const { lat, lng } = property.coordinates;

  const cacheKey = `stayassistant:places:${propertyId}:${type}`;

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

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal
    })

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

/* --- DASHBOARD SPA ROUTING --- */
app.get(/^\/dashboard(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(publicPath, "dashboard/index.html"));
});

/* --- OpenAI client --- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* --- property config endpoint --- */
app.get("/property/:id", async (req, res) => {

  const propertyId = req.params.id

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  res.json({
    id: property.id,
    name: property.name,
    branding: property.branding
  })

})

/* --- LOGIN --- */
app.post("/auth/login", async (req, res) => {

  const { email, password } = req.body

  const user = await getUser(email)

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const token = jwt.sign(
    { propertyId: user.propertyId },
    process.env.JWT_SECRET,
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

  /* --- PREVENT DUPLICATE USERS --- */

  const existingUser = await getUser(email)

  if (existingUser) {
    return res.status(400).json({
      error: "email already registered"
    })
  }

  const propertyId = "property_" + Date.now()

  /* --- CLONE DEMO PROPERTY TEMPLATE --- */

  const base = properties.demo_property

  const property = JSON.parse(JSON.stringify(base))

  /* --- PERSONALIZE PROPERTY --- */

  property.id = propertyId
  property.name = property_name

  property.knowledge.local_recommendations = []

  /* --- CREATE USER --- */

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = {
    email,
    password: hashedPassword,
    propertyId
  }

  /* --- SAVE IN REDIS --- */

  await createProperty(property)
  await createUser(user)

  // --- GLOBAL PROPERTY INDEX ---
  await redis.sAdd("stayassistant:properties", propertyId)

  /* --- CLEAR CACHE --- */

  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  /* --- CREATE TOKEN --- */

  const token = jwt.sign(
    { propertyId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )

  res.json({
    token,
    propertyId
  })

});

/* --- GET FAQ --- */
app.get("/property/:id/faq", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.json({ faq: [] })
  }

  res.json({
    faq: property.knowledge.faq
  })

});

/* --- UPDATE FAQ --- */
app.post("/property/:id/faq", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { faq } = req.body

  const property = await getProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.knowledge.faq = faq

  property.updatedAt = Date.now()

  await createProperty(property)

  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  /* --- ONBOARDING STEP COMPLETE --- */

  const onboardingKey = `stayassistant:onboarding:${propertyId}`

  let onboarding = await redis.get(onboardingKey)

  if (!onboarding) {
    onboarding = {}
  } else {
    onboarding = JSON.parse(onboarding)
  }

  onboarding.faq = true

  await redis.set(onboardingKey, JSON.stringify(onboarding))

  res.json({
    success: true
  })

});

/* --- GET BRANDING --- */
app.get("/property/:id/branding", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = await loadProperty(propertyId)

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
app.post("/property/:id/branding", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { property_name, button_text, primary_color } = req.body

  const property = await getProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.name = property_name

  property.branding = {
    button_text,
    primary_color
  }

  property.updatedAt = Date.now()

  await createProperty(property)

  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  res.json({
    success: true
  })

});

/* --- UPDATE PROPERTY INFO --- */
app.post("/property/:id/property-info", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const {
    checkin,
    checkout,
    checkin_instructions,
    late_checkin,
    wifi_name,
    wifi_password
  } = req.body

  const property = await getProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.knowledge.property_info = {
    ...property.knowledge.property_info,

    checkin,
    checkout,
    checkin_instructions,
    late_checkin,
    wifi_name,
    wifi_password
  }

  property.updatedAt = Date.now()

  await createProperty(property)

  // limpiar cache
  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  res.json({ success: true })

})

app.get("/property/:id/property-info", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  res.json({
    property_info: property.knowledge.property_info
  })

})


/* --- GET RECOMMENDATIONS --- */
app.get("/property/:id/recommendations", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.json({ recommendations: [] })
  }

  res.json({
    recommendations: property.knowledge.local_recommendations
  })

});


/* --- UPDATE RECOMMENDATIONS --- */
app.post("/property/:id/recommendations", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { recommendations } = req.body

  const property = await getProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  property.knowledge.local_recommendations = recommendations

  property.updatedAt = Date.now()

  await createProperty(property)

  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  /* --- ONBOARDING STEP COMPLETE --- */

  const onboardingKey = `stayassistant:onboarding:${propertyId}`

  let onboarding = await redis.get(onboardingKey)

  if (!onboarding) {
    onboarding = {}
  } else {
    onboarding = JSON.parse(onboarding)
  }

  onboarding.recommendations = true

  await redis.set(onboardingKey, JSON.stringify(onboarding))

  res.json({
    success: true
  })

});


/* --- chat endpoint --- */
app.post("/chat", chatLimiter, async (req, res) => {

  try {

    const userMessage = req.body.message || "";
    let userLanguage = req.body.language || null

    if (!userLanguage) {

      const msg = userMessage.toLowerCase()

      if (msg.match(/[ñáéíóú]/)) {
        userLanguage = "Español"
      }

      else if (msg.match(/[äöüß]/)) {
        userLanguage = "Deutsch"
      }

      else {
        userLanguage = "English"
      }

    }


    let conversationId = req.body.conversationId

    if (!conversationId) {
      conversationId = crypto.randomUUID()
    }

    const propertyId = req.body.propertyId || "demo_property";
    const hour = req.body.hour || null;

    console.log("Property:", propertyId);

    /* --- LOAD PROPERTY --- */
    let property = await loadProperty(propertyId)

    /* --- SAFETY PATCH (CRÍTICO) --- */
    if (!property.knowledge) {
      property.knowledge = {}
    }

    if (!Array.isArray(property.knowledge.faq)) {
      property.knowledge.faq = []
    }


    /* --- DEMO VISITOR LIMIT --- */
    if (propertyId === "demo_property") {

      const visitorId = req.body.visitorId || "anonymous"

      const demoKey = `stayassistant:demo:${visitorId}`

      const demoUsage = await redis.get(demoKey)

      const currentDemoUsage = Number(demoUsage || 0)

      const DEMO_LIMIT = 30

      if (currentDemoUsage >= DEMO_LIMIT) {

        return res.json({
          reply:
            "Thanks for trying StayAssistant. This demo allows a limited number of questions.",
          demo_limit: true
        })

      }

      await redis.incr(demoKey)

      await redis.expire(demoKey, 60 * 60 * 24) // 24h

    }

    /* --- MONTHLY USAGE BUCKET --- */
    const month = new Date().toISOString().slice(0, 7)
    const usageKey = `stayassistant:usage:${propertyId}:${month}`

    const usage = await redis.get(usageKey)
    const currentUsage = Number(usage || 0)
    const limit = await getUsageLimit(propertyId)

    if (currentUsage >= limit) {
      console.log("⛔ HARD LIMIT BLOCK", propertyId)

      return res.json({
        reply: "I'm sorry, I cannot assist further at the moment. Please contact the property directly for additional help.",
        limit_reached: true
      })
    }


    if (!property) {
      return res.json({
        reply: "Property configuration not found."
      });
    }

    /* --- INTENT DETECTION --- */
    const intent = detectIntent(userMessage)

    console.log("🧠 INTENT:", intent, "| MSG:", userMessage)

    const allowedAIIntents = ["other", "restaurants", "activities"]

    if (!allowedAIIntents.includes(intent)) {
      console.log("🚫 AI BLOCKED FOR INTENT:", intent)
    }

    if (intent === "other" && userMessage.length < 20) {
      return res.json({
        reply: "Could you please provide more details so I can assist you better?",
        language: userLanguage
      })
    }

    /* --- KNOWLEDGE SELECTION (AI Brain V2) --- */

    const knowledge = selectKnowledge(property, intent)

    /* --- INTENT DIRECT RESPONSE (COST SHIELD) --- */

    if (intent === "taxi") {

      return res.json({
        reply:
          "You can easily order a taxi using Uber or a local taxi service. Let me know if you need help with directions.",
        language: userLanguage
      })

    }

    if (intent === "wifi") {

      const info = property.knowledge.property_info

      let answer = "WiFi information: "

      if (info.wifi_name) {
        answer += `Network: ${info.wifi_name}. `
      }

      if (info.wifi_password) {
        answer += `Password: ${info.wifi_password}.`
      }

      return res.json({
        reply: answer,
        language: userLanguage
      })
    }



    if (intent === "checkin") {

      const info = property.knowledge.property_info

      let answer = ""

      if (info.checkin) {
        answer += `Check-in: from ${info.checkin}. `
      }

      if (info.late_checkin) {
        answer += `Late check-in: ${info.late_checkin}. `
      }

      if (info.checkin_instructions) {
        answer += `${info.checkin_instructions}. `
      }

      if (info.checkout) {
        answer += `Check-out: before ${info.checkout}.`
      }

      return res.json({
        reply: answer.trim(),
        language: userLanguage
      })
    }

    if (intent === "checkout") {
      const info = property.knowledge.property_info

      let answer = `Check-out: ${info.checkout}.`

      if (info.checkin) {
        answer += ` Check-in starts at ${info.checkin}.`
      }

      return res.json({
        reply: answer,
        language: userLanguage
      })
    }

    if (intent === "pharmacy") {

      return res.json({
        reply:
          "You can find nearby pharmacies using Google Maps. Let me know if you want recommendations.",
        language: userLanguage
      })

    }

    if (intent === "transport") {

      return res.json({
        reply:
          "Public transport options such as bus or metro are available nearby. Let me know your destination and I can help.",
        language: userLanguage
      })

    }

    /* --- ANALYTICS TRACKING --- */
    try {

      // 1️⃣ intent analytics (ya existente)

      const analyticsKey = `stayassistant:analytics:${propertyId}:questions`;

      await redis.zIncrBy(
        analyticsKey,
        1,
        intent
      );

      // hourly analytics

      const hourKey = `stayassistant:analytics:${propertyId}:hours`;

      const hourNow = hour !== null ? Number(hour) : new Date().getHours();

      await redis.hIncrBy(hourKey, String(hourNow), 1);

    } catch (err) {

      console.log("Analytics error:", err);

    }

    /* --- CHAT HISTORY --- */
    const historyKey = `stayassistant:chat:${propertyId}:${conversationId}`;

    /* --- REGISTER CONVERSATION --- */
    try {

      const listKey = `stayassistant:conversations:${propertyId}`

      const maxConversations = 200

      await redis.zAdd(listKey, {
        score: Date.now(),
        value: conversationId
      })

      const total = await redis.zCard(listKey)

      if (total > maxConversations) {
        await redis.zRemRangeByRank(listKey, 0, total - maxConversations - 1)
      }

    } catch (err) {

      console.log("Conversation index error:", err)

    }

    let history = await redis.get(historyKey);

    history = history ? JSON.parse(history) : [];

    const lastUserMessage = history
      .filter(m => m.role === "user")
      .slice(-1)[0]?.content

    if (lastUserMessage && lastUserMessage === userMessage) {

      console.log("⚠️ DUPLICATE MESSAGE BLOCKED")

      return res.json({
        reply: "I'll give you more helpful details about that 👇",
        language: userLanguage
      })
    }

    // 👉 SOLO AQUÍ añadimos el mensaje
    history.push({
      role: "user",
      content: userMessage
    });

    /* --- NORMALIZACION DE PREGUNTAS --- */
    function normalizeMessage(message) {

      return message
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\b(what|is|the|please|can|you|tell|me)\b/g, "")
        .replace(/\s+/g, " ")
        .trim()

    }

    const normalizedQuestion = normalizeMessage(userMessage)

    /* --- AISLAMIENTO MULTI-TENANT --- */
    const cacheKey = `stayassistant:cache:${propertyId}:${intent}:${normalizedQuestion}:${property.updatedAt || "v1"}`

    /* --- FAQ AUTO ANSWER --- */
    function similarity(a, b) {
      const aWords = a.split(" ")
      const bWords = b.split(" ")

      const matchCount = aWords.filter(word =>
        bWords.includes(word)
      ).length

      return matchCount / Math.max(aWords.length, bWords.length)
    }

    const faqMatch = property.knowledge.faq.find(f => {
      const normalizedFaq = normalizeMessage(f.question)
      return similarity(normalizedQuestion, normalizedFaq) > 0.5
    })

    if (faqMatch) {

      console.log("FAQ auto-answer triggered");

      let answer = faqMatch.answer;

      history.push({
        role: "assistant",
        content: answer
      });

      await redis.set(historyKey, JSON.stringify(history), {
        EX: 60 * 60 * 24 * 7
      });

      return res.json({
        reply: answer,
        language: userLanguage
      });

    }

    /* --- AI RESPONSE CACHE --- */

    const cachedReply = await redis.get(cacheKey);

    if (cachedReply) {

      console.log("AI cache hit");
      console.log("✅ AI CACHE HIT:", intent)

      history.push({
        role: "assistant",
        content: cachedReply
      });

      await redis.set(historyKey, JSON.stringify(history), {
        EX: 60 * 60 * 24 * 7
      });

      return res.json({
        reply: cachedReply,
        language: userLanguage
      });

    }



    /* --- AI GUARD (SMART FALLBACK) --- */
    if (
      intent !== "other" &&
      intent !== "restaurants" &&
      intent !== "activities"
    ) {

      console.log("🚫 AI BLOCKED (intent rule):", intent)

      return res.json({
        reply: "I'm not sure about that, but I’ll try to help. Could you rephrase your question?",
        language: userLanguage
      })
    }



    /* --- KNOWLEDGE QUALITY CHECK --- */
    if (!knowledge || knowledge.length < 30) {

      console.log("🚫 AI BLOCKED (low knowledge)")

      return res.json({
        reply: "I'm not sure about that, but I’ll try to help. Could you rephrase your question?",
        language: userLanguage
      })
    }

    /* --- LOAD NEARBY CONTEXT (SMART) --- */
    let nearbyContext = ""

    if (intent === "restaurants" || intent === "activities") {

      try {

        if (property.coordinates) {

          const { lat, lng } = property.coordinates

          const typeMap = {
            restaurants: "restaurant",
            activities: "tourist_attraction"
          }

          const placeType = typeMap[intent] || "restaurant"

          const url =
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${placeType}&key=${process.env.GOOGLE_PLACES_KEY}`

          const controller = new AbortController()
          setTimeout(() => controller.abort(), 5000)

          const response = await fetch(url, {
            signal: controller.signal
          })

          const data = await response.json()

          const places =
            data.results.slice(0, 3).map(p =>
              `${p.name} (${p.rating || "4+"}⭐)`
            )

          nearbyContext =
            `LIVE ${intent.toUpperCase()} NEARBY:\n- ${places.join("\n- ")}`

        }

      } catch (err) {

        console.log("Nearby context error", err)

      }

    }


    /* --- AI COMPLETION --- */
    const context = detectContext(hour);

    const trimmedHistory = history.map(m => ({
      role: m.role,
      content: m.content.slice(0, 300)
    }))

    let completion;

    try {

      console.log("🤖 CALLING OPENAI:", intent)
      console.log("📊 KNOWLEDGE LENGTH:", knowledge?.length)

      completion = await Promise.race([

        openai.chat.completions.create({

          model: "gpt-4o-mini",

          max_tokens: 120,
          temperature: 0.4,

          messages: [
            {
              role: "system",
              content:
                buildPrompt(property, userLanguage, context, knowledge) +
                "\n\n--- LIVE DATA (REAL-TIME, PRIORITY) ---\n" +
                nearbyContext
            },
            ...trimmedHistory
          ]

        }),

        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout")), 8000)
        )

      ])

    } catch (err) {

      console.log("OpenAI timeout or error:", err.message)

      return res.json({
        reply: "I'm sorry, I'm having trouble answering right now. Please try again in a moment."
      })

    }

    const reply = completion.choices[0].message.content;

    // --- AI COST TRACKING ---
    let usageData = null

    try {

      usageData = completion.usage

      console.log("🧾 OPENAI USAGE:", usageData)

      if (!usageData) {
        console.log("⚠️ NO USAGE DATA RETURNED")
      }

      if (usageData) {

        const inputTokens = usageData.prompt_tokens || 0
        const outputTokens = usageData.completion_tokens || 0

        const cost =
          (inputTokens * 0.00000015) +
          (outputTokens * 0.0000006)

        const costKey = `stayassistant:cost:${propertyId}:${month}`

        await redis.hIncrByFloat(costKey, "cost", cost)
        await redis.hIncrBy(costKey, "input_tokens", inputTokens)
        await redis.hIncrBy(costKey, "output_tokens", outputTokens)

        console.log("💰 COST SAVED:", costKey)

      }

    } catch (err) {
      console.log("Cost tracking error:", err)
    }

    try {
      await redis.incr(usageKey)

      // 🔥 INVALIDATE ANALYTICS CACHE (NEW DATA)
      await invalidateAnalyticsCache(propertyId)

      // ⚙️ PRECOMPUTE (NON-BLOCKING)
      shouldRecompute(propertyId).then(should => {
        if (should) {
          precomputeInsights(propertyId)
        }
      })

      const ttl = await redis.ttl(usageKey)

      if (ttl === -1) {
        await redis.expire(usageKey, 60 * 60 * 24 * 90)
      }

    } catch (err) {
      console.log("Usage increment error:", err)
    }

    let detectedLanguage = userLanguage;

    if (!detectedLanguage) {

      const match = reply.match(/LANGUAGE:\s*(English|Español|Deutsch)/i);

      if (match) {
        detectedLanguage = match[1];
      }

    }

    const cleanReply = reply
      .replace(/LANGUAGE:\s*(English|Español|Deutsch)/i, "")
      .trim();

    const shortReply = cleanReply.slice(0, 500)

    /* --- SAVE AI RESPONSE CACHE --- */

    try {

      if (shortReply.length > 20) {
        await redis.set(cacheKey, shortReply, {
          EX: 60 * 60 * 24
        });
      }

    } catch (err) {

      console.log("Cache save error:", err);

    }

    history.push({
      role: "assistant",
      content: cleanReply
    });

    if (history.length > 6) {
      history = history.slice(-6);
    }

    await redis.set(historyKey, JSON.stringify(history), {
      EX: 60 * 60 * 24 * 7
    });

    res.json({
      reply: shortReply,
      language: detectedLanguage
    });

  } catch (error) {

    console.error("OpenAI error:", error);

    res.status(500).json({
      reply: "Sorry, something went wrong."
    });

  }

});

/* --- LIST CONVERSATIONS --- */
app.get("/conversations/:propertyId", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const listKey = `stayassistant:conversations:${propertyId}`

    const ids = await redis.zRange(listKey, 0, 19, { REV: true }) || []

    const conversations = []

    for (const id of ids) {

      const key = `stayassistant:chat:${propertyId}:${id}`

      const history = await redis.get(key)

      if (!history) continue

      let parsed

      try {
        parsed = JSON.parse(history)
      } catch {
        continue
      }

      const preview =
        parsed.find(m => m.role === "user")?.content || ""

      conversations.push({
        id,
        preview,
        messages: parsed
      })

    }

    res.json({ conversations })

  } catch (err) {

    console.error("Conversations error:", err)

    res.json({ conversations: [] })   // <- nunca 500

  }

})

/* --- CONVERSATION SCORING --- */
app.get("/analytics/:propertyId/conversation-score", authenticate, async (req, res) => {

  const propertyId = req.params.propertyId

  const cacheKey = `stayassistant:conversation_score:${propertyId}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    return res.json(JSON.parse(cached))
  }

  try {

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const listKey = `stayassistant:conversations:${propertyId}`

    const ids = await redis.zRange(listKey, 0, 10, { REV: true }) || []

    if (ids.length === 0) {
      return res.json({ score: null })
    }

    /* ✅ AQUÍ ESTÁ EL CAMBIO IMPORTANTE */
    const promises = ids.map(async (id) => {

      const key = `stayassistant:chat:${propertyId}:${id}`

      const history = await redis.get(key)
      if (!history) return null

      let parsed

      try {
        parsed = JSON.parse(history)
      } catch {
        return null
      }

      const messages = parsed
        .map(m => `${m.role}: ${m.content}`)
        .join("\n")

      const prompt = `
        Analyze this conversation:

        ${messages}

        Score from 0 to 10:
        - clarity
        - user satisfaction
        - friction

        Return JSON:
        {
          "clarity": number,
          "satisfaction": number,
          "friction": number
        }
        `

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 100,
        messages: [
          { role: "system", content: "You analyze chat quality." },
          { role: "user", content: prompt }
        ]
      })

      try {
        return JSON.parse(completion.choices[0].message.content)
      } catch {
        return null
      }

    })

    /* ✅ SOLO UNA VEZ */
    const results = await Promise.all(promises)

    const scores = results.filter(Boolean)

    if (scores.length === 0) {
      return res.json({ score: null })
    }

    const avg = (key) =>
      scores.reduce((sum, s) => sum + (s[key] || 0), 0) / scores.length

    const result = {
      clarity: avg("clarity"),
      satisfaction: avg("satisfaction"),
      friction: avg("friction")
    }

    await redis.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 5
    })

    res.json(result)

  } catch (err) {

    console.error("Conversation score error", err)

    res.json({ score: null })

  }

})

/* --- SEMANTIC INSIGHTS (CONVERSATION LEVEL) --- */
app.get("/analytics/:propertyId/semantic-insights", authenticate, async (req, res) => {

  const propertyId = req.params.propertyId

  const cacheKey = `stayassistant:semantic:${propertyId}`

  const cached = await redis.get(cacheKey)

  if (cached) {
    return res.json(JSON.parse(cached))
  }

  try {

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const listKey = `stayassistant:conversations:${propertyId}`

    const ids = await redis.zRange(listKey, 0, 10, { REV: true }) || []

    let allMessages = []

    for (const id of ids) {

      const key = `stayassistant:chat:${propertyId}:${id}`

      const history = await redis.get(key)

      if (!history) continue

      try {
        const parsed = JSON.parse(history)

        parsed.forEach(m => {
          if (m.role === "user") {
            allMessages.push(m.content)
          }
        })

      } catch { }

    }

    const sample = allMessages.slice(0, 20).join("\n")

    if (!sample) {
      return res.json({ insights: [] })
    }

    const prompt = `
        Analyze these guest messages.

        Detect:
        - confusion
        - repeated questions
        - missing information
        - opportunities to improve FAQ

        Messages:
        ${sample}

        Return 3 short insights.
        `

    const completion = await openai.chat.completions.create({

      model: "gpt-4o-mini",

      max_tokens: 120,
      temperature: 0.3,

      messages: [
        { role: "system", content: "You analyze customer conversations." },
        { role: "user", content: prompt }
      ]

    })

    const text = completion.choices[0].message.content

    const insights = text
      .split("\n")
      .filter(line => line.trim().length > 10)

    const result = { insights }

    await redis.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 10 // 10 min (más pesado)
    })

    res.json(result)

  } catch (err) {

    console.error("Semantic insights error", err)

    res.json({ insights: [] })

  }

})

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

/* --- ALERT SYSTEM --- */

app.get("/analytics/:propertyId/alerts", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`

    const intents = await redis.zRangeWithScores(intentKey, 0, 4, { REV: true })

    const alerts = []

    /* --- HIGH DEMAND ALERT --- */

    const top = intents[0]

    if (top && top.score >= 10) {

      alerts.push({
        type: "demand",
        level: "warning",
        text: `High demand for "${top.value}" (${top.score} requests)`
      })

    }

    /* --- MISSING FAQ ALERT --- */

    const property = await getProperty(propertyId)

    if (property && property.knowledge?.faq) {

      const faqText = property.knowledge.faq.map(f => f.question.toLowerCase()).join(" ")

      intents.forEach(i => {

        if (
          i.score >= 5 &&
          !faqText.includes(i.value)
        ) {

          alerts.push({
            type: "faq_gap",
            level: "critical",
            text: `Missing FAQ for "${i.value}" (high demand)`
          })

        }

      })

    }

    res.json({ alerts })

  } catch (err) {

    console.error("Alerts error", err)

    res.json({ alerts: [] })

  }

})

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

/* --- ANALYTICS ADVANCED --- */
app.get("/analytics/:propertyId/advanced", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId;

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" });
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`;
    const hourKey = `stayassistant:analytics:${propertyId}:hours`;

    const intents = await redis.zRangeWithScores(intentKey, 0, 9, { REV: true });

    const hours = await redis.hGetAll(hourKey);
    const month = new Date().toISOString().slice(0, 7)

    const usageKey = `stayassistant:usage:${propertyId}:${month}`

    const usage = await redis.get(usageKey)

    const totalMessages = Number(usage || 0);

    const topIntents = intents.map(i => ({
      intent: i.value,
      count: i.score
    }));

    /* --- DETECT IF ANALYTICS EXISTS --- */

    const hasData =
      totalMessages > 0 ||
      topIntents.length > 0 ||
      Object.keys(hours).length > 0;

    res.json({

      total_messages: totalMessages,

      top_intents: topIntents,

      peak_hours: hours,

      has_data: hasData

    });

  } catch (err) {

    console.error("Advanced analytics error", err);

    res.status(500).json({ error: "analytics failed" });

  }

});

/* --- BUSINESS INSIGHTS (SAAS LEVEL) --- */
app.get("/analytics/:propertyId/business", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`
    const hourKey = `stayassistant:analytics:${propertyId}:hours`

    const intents = await redis.zRangeWithScores(intentKey, 0, 9, { REV: true })
    const hours = await redis.hGetAll(hourKey)

    const insights = []

    /* --- TOP INTENT INSIGHT --- */

    if (intents.length > 0) {

      const top = intents[0]

      if (top.value === "restaurants") {

        insights.push({
          type: "revenue",
          text: "Guests frequently ask about restaurants. Adding curated recommendations can improve guest satisfaction."
        })

      }

      if (top.value === "activities") {

        insights.push({
          type: "experience",
          text: "Guests are looking for activities. Suggesting local experiences can increase engagement."
        })

      }

    }

    /* --- PEAK HOUR INSIGHT --- */

    if (Object.keys(hours).length > 0) {

      const peak = Object.entries(hours)
        .sort((a, b) => b[1] - a[1])[0]

      const hour = peak[0]

      insights.push({
        type: "timing",
        text: `Most guest activity happens around ${hour}:00. Optimize your concierge availability during this time.`
      })

    }

    res.json({ insights })

  } catch (err) {

    console.error("Business insights error", err)

    res.json({ insights: [] })

  }

})

/* --- AI INSIGHTS (GPT POWERED) --- */
app.get("/analytics/:propertyId/ai-insights", authenticate, async (req, res) => {

  const propertyId = req.params.propertyId  // ✅ PRIMERO

  const cacheKey = `stayassistant:ai_insights:${propertyId}`

  const cached = await redis.get(cacheKey)

  if (cached) {
    return res.json(JSON.parse(cached))
  }

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`
    const hourKey = `stayassistant:analytics:${propertyId}:hours`

    const intents = await redis.zRangeWithScores(intentKey, 0, 4, { REV: true })
    const hours = await redis.hGetAll(hourKey)

    const topIntents = intents.map(i => `${i.value} (${i.score})`).join(", ")

    const hourSummary = Object.entries(hours)
      .map(([h, v]) => `${h}:00 (${v})`)
      .join(", ")

    const prompt = `
        You are a SaaS analytics assistant.

        Analyze this property data and give 2-3 short business insights.

        Top guest intents:
        ${topIntents}

        Peak hours:
        ${hourSummary}

        Rules:
        - Be concise
        - Be actionable
        - Do NOT be generic
        - Focus on improving guest experience or revenue
        `

    const completion = await openai.chat.completions.create({

      model: "gpt-4o-mini",

      max_tokens: 120,
      temperature: 0.4,

      messages: [
        { role: "system", content: "You analyze SaaS product analytics." },
        { role: "user", content: prompt }
      ]

    })

    const text = completion.choices[0].message.content

    const insights = text
      .split("\n")
      .filter(line => line.trim().length > 10)

    const result = { insights }

    await redis.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 5 // 5 min
    })

    res.json(result)

  } catch (err) {

    console.error("AI insights error", err)

    res.json({ insights: [] })

  }

})

/* --- APPLY AI ACTION --- */
app.post("/analytics/:propertyId/apply-action", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId
    const { action } = req.body

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    if (!property.knowledge) {
      property.knowledge = {}
    }

    if (!Array.isArray(property.knowledge.faq)) {
      property.knowledge.faq = []
    }

    /* --- ACTIONS --- */

    if (action === "add_restaurant_faq") {

      const exists = property.knowledge.faq.some(f =>
        f.question.toLowerCase().includes("restaurant")
      )

      if (!exists) {
        property.knowledge.faq.push({
          question: "Can you recommend good restaurants nearby?",
          answer: "Of course! I can suggest great restaurants based on your preferences. Let me know what type of cuisine you like."
        })
      }

    }

    if (action === "add_activities_faq") {

      const exists = property.knowledge.faq.some(f =>
        f.question.toLowerCase().includes("activities")
      )

      if (!exists) {
        property.knowledge.faq.push({
          question: "What activities can I do nearby?",
          answer: "There are many great activities nearby including local attractions, tours and outdoor experiences."
        })
      }

    }

    property.updatedAt = Date.now()

    await createProperty(property)

    // 🔥 FIX CRÍTICO
    propertyCache.delete(propertyId)

    await invalidateAnalyticsCache(propertyId)

    res.json({ success: true })

  } catch (err) {

    console.error("Apply action error", err)

    res.status(500).json({ error: "action failed" })

  }

})

/* --- FAQ SUGGESTIONS --- */
app.get("/analytics/:propertyId/faq-suggestions", authenticate, async (req, res) => {

  const propertyId = req.params.propertyId

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const key = `stayassistant:analytics:${propertyId}:questions`

  const data = await redis.zRangeWithScores(key, 0, 9, { REV: true })

  const suggestions = data
    .filter(i => i.score >= 3)
    .map(i => ({
      question: i.value,
      count: i.score
    }))

  res.json({ suggestions })

})

async function getFaqSuggestions(propertyId) {

  const key = `stayassistant:analytics:${propertyId}:questions`

  const data = await redis.zRangeWithScores(
    key,
    0,
    9,
    { REV: true }
  )

  const suggestions = data
    .filter(i => i.score >= 3)
    .map(i => ({
      question: i.value,
      count: i.score
    }))

  return suggestions

}

/* --- AUTO OPTIMIZE PROPERTY --- */
app.post("/analytics/:propertyId/auto-optimize", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`

    const intents = await redis.zRangeWithScores(intentKey, 0, 2, { REV: true })

    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    let changes = []

    for (const i of intents) {

      if (i.value === "restaurants" && i.score >= 5) {

        property.knowledge.faq.push({
          question: "Can you recommend restaurants nearby?",
          answer: "Of course! I can suggest great restaurants based on your preferences."
        })

        changes.push("restaurant FAQ added")

      }

      if (i.value === "activities" && i.score >= 5) {

        property.knowledge.faq.push({
          question: "What activities can I do nearby?",
          answer: "There are many activities including tours, outdoor experiences and cultural visits."
        })

        changes.push("activities FAQ added")

      }

    }

    property.updatedAt = Date.now()

    await createProperty(property)

    propertyCache.delete(propertyId)

    await invalidateAnalyticsCache(propertyId)

    res.json({
      success: true,
      changes
    })

  } catch (err) {

    console.error("Auto optimize error", err)

    res.status(500).json({ error: "auto optimize failed" })

  }

})

/* --- FAQ SUGGESTIONS AI --- */
app.get("/analytics/:propertyId/faq-suggestions-ai", authenticate, async (req, res) => {

  const { propertyId } = req.params

  const cacheKey = `stayassistant:faq_ai:${propertyId}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    return res.json(JSON.parse(cached))
  }

  try {

    const suggestions = await getFaqSuggestions(propertyId)

    const promises = suggestions.map(async (s) => {

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a hotel concierge assistant."
          },
          {
            role: "user",
            content: `Guests often ask: "${s.question}". Write a helpful concierge style answer.`
          }
        ]
      })

      return {
        question: s.question,
        count: s.count,
        suggested_answer: completion.choices[0].message.content
      }

    })

    const enhanced = await Promise.all(promises)

    res.json({ suggestions: enhanced })

  } catch (err) {

    console.error(err)
    res.status(500).json({ error: "AI suggestions failed" })

  }

})

/* --- GET ONBOARDING --- */
app.get("/onboarding/status", authenticate, async (req, res) => {

  const propertyId = req.propertyId

  const key = `stayassistant:onboarding:${propertyId}`

  let data = await redis.get(key)

  if (!data) {

    data = {
      faq: false,
      recommendations: false,
      widget: false
    }

    await redis.set(key, JSON.stringify(data))

  } else {

    data = JSON.parse(data)

  }

  res.json(data)

})

/* --- STEPS ONBOARDING --- */
app.post("/onboarding/complete", authenticate, async (req, res) => {

  const { step } = req.body
  const propertyId = req.propertyId

  const key = `stayassistant:onboarding:${propertyId}`

  let data = await redis.get(key)

  if (!data) {
    data = {}
  } else {
    data = JSON.parse(data)
  }

  data[step] = true

  await redis.set(key, JSON.stringify(data))

  res.json({ success: true })

})

/* --- AI SETUP WIZARD --- */
app.post("/ai/setup", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const {
      city,
      checkin,
      checkout
    } = req.body

    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    const prompt = `
      Create initial concierge setup for a vacation rental in ${city}.

      Return JSON with:

      faq
      recommendations

      Example format:

      {
      "faq":[
        {"question":"How do I open the door?","answer":"..."},
        {"question":"Where can I park?","answer":"..."}
      ],
      "recommendations":[
        "Best local restaurant",
        "Nearby supermarket",
        "Taxi service"
      ]
      }
      `

    const completion = await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [
        { role: "system", content: "You generate helpful concierge setup for hotels." },
        { role: "user", content: prompt }
      ]

    })

    const text = completion.choices[0].message.content

    const json = JSON.parse(text)

    property.knowledge.faq = json.faq

    property.knowledge.local_recommendations = json.recommendations

    property.knowledge.property_info.checkin = checkin
    property.knowledge.property_info.checkout = checkout

    property.updatedAt = Date.now()

    await createProperty(property)

    propertyCache.delete(propertyId)

    await invalidateAnalyticsCache(propertyId)

    res.json({ success: true })

  } catch (err) {

    console.error("AI setup error", err)

    res.status(500).json({ error: "setup failed" })

  }

})

/* --- PROPERTY SETUP (ADDRESS + COORDINATES) --- */
app.post("/property/setup", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const {
      address,
      city,
      country,
      amenities,
      services
    } = req.body

    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    /* --- GOOGLE GEOCODING --- */

    const fullAddress = `${address}, ${city}, ${country}`

    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_GEOCODING_KEY}`

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 5000)

    const geoRes = await fetch(geoUrl, {
      signal: controller.signal
    })

    const geoData = await geoRes.json()

    if (!geoData.results?.length) {
      return res.status(400).json({ error: "geocoding failed" })
    }

    const location = geoData.results[0].geometry.location

    /* --- SAVE PROPERTY DATA --- */

    property.address = address
    property.city = city
    property.country = country

    property.coordinates = {
      lat: location.lat,
      lng: location.lng
    }

    property.amenities = amenities || []
    property.services = services || []

    await createProperty(property)

    /* CLEAR PLACES CACHE AFTER LOCATION CHANGE */

    const placeTypes = [
      "restaurants",
      "cafes",
      "bars",
      "activities",
      "parks",
      "pharmacy",
      "transport",
      "supermarket"
    ]

    for (const type of placeTypes) {

      const key = `stayassistant:places:${propertyId}:${type}`

      await redis.del(key)

    }

    propertyCache.delete(propertyId)

    await invalidateAnalyticsCache(propertyId)

    res.json({
      success: true,
      coordinates: property.coordinates
    })

  } catch (err) {

    console.error("Property setup error", err)

    res.status(500).json({ error: "setup failed" })

  }

})

/* --- CREATE STRIPE CHECKOUT --- */
app.post("/billing/create-checkout", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId
    const { plan } = req.body

    let priceId

    if (plan === "pro") {
      priceId = process.env.STRIPE_PRO_PRICE_ID
    }

    if (plan === "business") {
      priceId = process.env.STRIPE_BUSINESS_PRICE_ID
    }

    if (!priceId) {
      return res.status(400).json({ error: "invalid plan" })
    }

    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],

      success_url: "https://stayassistantai.com/dashboard?billing=success",

      cancel_url: "https://stayassistantai.com/dashboard?billing=cancel",

      metadata: {
        propertyId: propertyId,
        plan: plan
      }

    })

    res.json({ url: session.url })

  } catch (err) {

    console.error("Stripe checkout error:", err)

    res.status(500).json({ error: "stripe failed" })

  }

})

/* --- SAVE SUBSCRIPTION HELPER --- */
async function saveSubscription(propertyId, data) {

  const key = `stayassistant:subscription:${propertyId}`

  await redis.set(key, JSON.stringify(data))

  /* --- CREATE SUBSCRIPTION INDEX --- */

  if (data.stripeSubscription) {

    const indexKey = `stayassistant:subscription_index:${data.stripeSubscription}`

    await redis.set(indexKey, propertyId)

  }

}

/* --- STRIPE WEBHOOK --- */
app.post("/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {

  const sig = req.headers["stripe-signature"]

  let event

  try {

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

  } catch (err) {

    console.log("Webhook signature failed", err)

    return res.status(400).send(`Webhook Error: ${err.message}`)

  }

  try {

    /* --- CHECKOUT COMPLETED (NEW SUBSCRIPTION) --- */

    if (event.type === "checkout.session.completed") {

      const session = event.data.object

      const propertyId = session.metadata.propertyId
      const plan = session.metadata.plan

      await saveSubscription(propertyId, {
        plan,
        status: "active",
        stripeCustomer: session.customer,
        stripeSubscription: session.subscription
      })

      console.log("Subscription activated:", propertyId)

    }

    /* --- SUBSCRIPTION UPDATED (UPGRADE / DOWNGRADE) --- */

    if (event.type === "customer.subscription.updated") {

      const subscription = event.data.object

      const stripeSubId = subscription.id

      const propertyId = await redis.get(
        `stayassistant:subscription_index:${stripeSubId}`
      )

      if (propertyId) {

        const key = `stayassistant:subscription:${propertyId}`

        const sub = JSON.parse(await redis.get(key))

        sub.status = subscription.status

        await redis.set(key, JSON.stringify(sub))

        console.log("Subscription updated:", propertyId)

      }

    }

    /* --- SUBSCRIPTION CANCELLED --- */

    if (event.type === "customer.subscription.deleted") {

      const subscription = event.data.object

      const stripeSubId = subscription.id

      const propertyId = await redis.get(
        `stayassistant:subscription_index:${stripeSubId}`
      )

      if (propertyId) {

        const key = `stayassistant:subscription:${propertyId}`

        await redis.set(key, JSON.stringify({
          plan: "free",
          status: "cancelled"
        }))

        console.log("Subscription cancelled:", propertyId)

      }

    }

    /* --- PAYMENT FAILED --- */

    if (event.type === "invoice.payment_failed") {

      const invoice = event.data.object

      const stripeSubId = invoice.subscription

      const propertyId = await redis.get(
        `stayassistant:subscription_index:${stripeSubId}`
      )

      if (propertyId) {

        const key = `stayassistant:subscription:${propertyId}`

        const sub = JSON.parse(await redis.get(key))

        sub.status = "payment_failed"

        await redis.set(key, JSON.stringify(sub))

        console.log("Payment failed:", propertyId)

      }

    }

  } catch (err) {

    console.error("Webhook processing error", err)

  }

  res.json({ received: true })

})

/* --- GET SUBSCRIPTION --- */
app.get("/billing/subscription", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const key = `stayassistant:subscription:${propertyId}`

    const sub = await redis.get(key)

    if (!sub) {

      return res.json({
        plan: "free",
        status: "active"
      })

    }

    res.json(JSON.parse(sub))

  } catch (err) {

    res.status(500).json({ error: "subscription failed" })

  }

})

/* --- STRIPE BILLING PORTAL --- */
app.post("/billing/portal", authenticate, async (req, res) => {

  const propertyId = req.propertyId

  const key = `stayassistant:subscription:${propertyId}`

  const sub = JSON.parse(await redis.get(key))

  if (!sub?.stripeCustomer) {
    return res.status(400).json({ error: "no customer" })
  }

  const session = await stripe.billingPortal.sessions.create({

    customer: sub.stripeCustomer,

    return_url: "https://www.stayassistantai.com/dashboard"

  })

  res.json({ url: session.url })

})

/*  DEBUGS TEMPORALES */
app.get("/debug/redis", async (req, res) => {

  const keys = await redis.keys("*")

  res.json({
    keys
  })

})


app.get("/debug/hours/:propertyId", async (req, res) => {

  const propertyId = req.params.propertyId

  const key = `stayassistant:analytics:${propertyId}:hours`

  const data = await redis.hGetAll(key)

  res.json({
    key,
    data
  })

})


/* --- server port --- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});