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

const propertyCache = new Map()

async function loadProperty(propertyId) {

  // 1️⃣ memory cache
  if (propertyCache.has(propertyId)) {
    return propertyCache.get(propertyId)
  }

  // 2️⃣ Redis
  let property = await getProperty(propertyId)

  // 3️⃣ fallback demo property
  if (!property) {
    property = await getProperty("demo_property") || properties["demo_property"]
  }

  // 4️⃣ cache result
  if (property) {
    propertyCache.set(propertyId, property)
  }

  return property
}

/* --- SAAS PLAN LIMITS --- */

const PLAN_LIMITS = {

  free: 100,          // hoteles nuevos
  pro: 2000,          // plan pago futuro
  enterprise: Infinity

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

  }

}

await seedDatabase()

/*
if (!(await getProperty("demo_property"))) {

  console.log("Seeding demo_property into Redis")

  await createProperty(properties["demo_property"])

}
*/

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

/* --- chat limiter ---*/

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

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


app.get("/property/:id/suggestions", async (req, res) => {

  const propertyId = req.params.id
  const language = req.query.lang || "English"

  const property = await loadProperty(propertyId)

  if (!property) {
    return res.json({ suggestions: [] })
  }

  const faq = property.knowledge.faq.slice(0, 2)
  const services = property.knowledge.services.slice(0, 2)

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

  /* --- CLONE DEMO PROPERTY TEMPLATE --- */

  const base = properties.demo_property

  const property = JSON.parse(JSON.stringify(base))

  /* --- PERSONALIZE PROPERTY --- */

  property.id = propertyId
  property.name = property_name

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

  /* --- CLEAR CACHE --- */

  propertyCache.delete(propertyId)

  /* --- CREATE TOKEN --- */

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

  await createProperty(property)

  propertyCache.delete(propertyId)

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

  await createProperty(property)

  propertyCache.delete(propertyId)

  res.json({
    success: true
  })

});


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

  await createProperty(property)

  propertyCache.delete(propertyId)

  res.json({
    success: true
  })

});


/* --- chat endpoint --- */

app.post("/chat", chatLimiter, async (req, res) => {

  try {

    const userMessage = req.body.message || "";
    const userLanguage = req.body.language || null;
    const conversationId = req.body.conversationId || "default";
    const propertyId = req.body.propertyId || "demo_property";
    const hour = req.body.hour || null;

    console.log("Property:", propertyId);

    /* --- LOAD PROPERTY --- */

    let property = await loadProperty(propertyId)

    /* --- MONTHLY USAGE BUCKET --- */

    const month = new Date().toISOString().slice(0, 7)

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

    if (!property) {
      return res.json({
        reply: "Property configuration not found."
      });
    }

    /* --- INTENT DETECTION --- */

    const intent = detectIntent(userMessage)

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

      // 2️⃣ message usage counter (nuevo)

      const usageKey = `stayassistant:usage:${propertyId}:${month}`;

      // 3️⃣ hourly analytics (nuevo)

      const hourKey = `stayassistant:analytics:${propertyId}:hours`;

      const hourNow = hour !== null ? Number(hour) : new Date().getHours();

      await redis.hIncrBy(hourKey, String(hourNow), 1);

    } catch (err) {

      console.log("Analytics error:", err);

    }

    /* --- USAGE LIMIT PROTECTION --- */

    let usageKey = `stayassistant:usage:${propertyId}:${month}`

    try {

      const usage = await redis.get(usageKey)

      const currentUsage = Number(usage || 0)

      const limit = await getUsageLimit(propertyId)

      if (currentUsage >= limit) {

        console.log("Usage limit reached:", propertyId)

        return res.json({
          reply:
            "I'm sorry, I cannot assist further at the moment. Please contact the property directly for additional help.",
          limit_reached: true
        })

      }

    } catch (err) {

      console.log("Usage check error:", err)

    }

    /* --- INCREMENT MONTHLY USAGE --- */

    try {

      await redis.incr(usageKey)

      const ttl = await redis.ttl(usageKey)

      if (ttl === -1) {
        await redis.expire(usageKey, 60 * 60 * 24 * 90)
      }

    } catch (err) {

      console.log("Usage increment error:", err)

    }


    /* --- CHAT HISTORY --- */

    const historyKey = `stayassistant:chat:${propertyId}:${conversationId}`;

    let history = await redis.get(historyKey);

    history = history ? JSON.parse(history) : [];

    history.push({
      role: "user",
      content: userMessage
    });

    const normalizedMessage = userMessage.toLowerCase();

    /* --- NORMALIZACION DE PREGUNTAS --- */
    const normalizedQuestion = normalizedMessage
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    /* --- AISLAMIENTO MULTI-TENANT --- */
    const cacheKey = `stayassistant:cache:${propertyId}:${normalizedQuestion}`;

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
      normalizedMessage.includes("salida")

    ) {

      let answer = `
        Check-in: ${property.knowledge.property_info.checkin}

        Check-out: ${property.knowledge.property_info.checkout}
        `

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

    /* --- AI RESPONSE CACHE --- */

    const cachedReply = await redis.get(cacheKey);

    if (cachedReply) {

      console.log("AI cache hit");

      history.push({
        role: "assistant",
        content: cachedReply
      });

      await redis.set(historyKey, JSON.stringify(history), {
        EX: 60 * 60 * 6
      });

      return res.json({
        reply: cachedReply,
        language: userLanguage
      });

    }

    /* --- AI COMPLETION --- */

    const context = detectContext(hour);

    const completion = await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [
        {
          role: "system",
          content: buildPrompt(property, userLanguage, context, knowledge)
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

    const cleanReply = reply
      .replace(/LANGUAGE:\s*(English|Español|Deutsch)/i, "")
      .trim();

    /* --- SAVE AI RESPONSE CACHE --- */

    try {

      await redis.set(cacheKey, cleanReply, {
        EX: 60 * 60 * 24
      });

    } catch (err) {

      console.log("Cache save error:", err);

    }

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

/* --- ANALYTICS ADVANCED --- */
app.get("/analytics/:propertyId/advanced", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId;

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" });
    }

    const intentKey = `stayassistant:analytics:${propertyId}:questions`;
    const hourKey = `stayassistant:analytics:${propertyId}:hours`;

    const month = new Date().toISOString().slice(0, 7)
    const usageKey = `stayassistant:usage:${propertyId}:${month}`

    const intents = await redis.zRangeWithScores(intentKey, 0, 9, { REV: true });

    const hours = await redis.hGetAll(hourKey);

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

    if (event.type === "checkout.session.completed") {

      const session = event.data.object

      const propertyId = session.metadata.propertyId
      const plan = session.metadata.plan

      const subscriptionKey = `stayassistant:subscription:${propertyId}`

      await redis.set(
        subscriptionKey,
        JSON.stringify({
          plan: plan,
          status: "active",
          stripeCustomer: session.customer,
          stripeSubscription: session.subscription
        })
      )

      console.log("Subscription activated:", propertyId)

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