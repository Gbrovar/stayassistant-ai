import "dotenv/config"

import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { authenticate, requireAdmin } from "./authMiddleware.js";
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
import { computeCustomerScore, getUpgradeStrategy } from "./services/ltv.service.js";

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

async function triggerPrecompute(propertyId) {
  precomputeInsights(propertyId)
}

async function cancelActiveSubscriptions(customerId) {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active"
    })

    for (const sub of subs.data) {
      console.log("🧨 Cancelling old subscription:", sub.id)

      await stripe.subscriptions.cancel(sub.id, {
        invoice_now: false,
        prorate: false
      })
    }

  } catch (err) {
    console.log("Cancel subscriptions error:", err.message)
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

async function getRealSubscription(propertyId) {

  const subRaw = await redis.get(`stayassistant:subscription:${propertyId}`)

  if (!subRaw) return { plan: "free" }

  const sub = JSON.parse(subRaw)

  if (!sub.stripeSubscription) return sub

  try {

    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripeSubscription
    )

    if (stripeSub.status === "canceled") {
      return { plan: "free", status: stripeSub.status }
    }

    return sub

  } catch (err) {

    console.log("Stripe sync fallback:", err.message)

    return sub
  }
}

function getOveragePrice(plan) {
  if (plan === "pro") return 0.02
  if (plan === "business") return 0.02
  return 0.05
}

async function getUsageMode(propertyId) {
  const key = `stayassistant:usage_mode:${propertyId}`
  const mode = await redis.get(key)
  return mode || "hard_limit"
}

function getCostLimit(plan) {

  if (plan === "pro") return 10
  if (plan === "business") return 50

  return 2
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

/* --- Plan price --- */
function getPlanPrice(plan) {
  if (plan === "pro") return 39
  if (plan === "business") return 99
  return 0
}

async function checkUsageAndCost(propertyId) {

  const month = new Date().toISOString().slice(0, 7)

  const usageKey = `stayassistant:usage:${propertyId}:${month}`
  const costKey = `stayassistant:cost:${propertyId}:${month}`

  const usage = Number(await redis.get(usageKey) || 0)
  const cost = Number(await redis.hGet(costKey, "cost") || 0)

  const limit = await getUsageLimit(propertyId)

  const usageRatio = usage / limit

  const sub = await getRealSubscription(propertyId)
  const plan = sub.plan || "free"

  /* ----------------------------
     🟥 FREE PLAN → HARD LIMIT
  ---------------------------- */

  if (plan === "free" && usageRatio >= 1) {
    return {
      allowed: false,
      mode: "blocked",
      reason: "free_limit_reached"
    }
  }

  /* ----------------------------
     🟢 PAID PLANS → NEVER BLOCK
  ---------------------------- */

  if (plan !== "free") {

    if (usageRatio < 0.8) {
      return { allowed: true, mode: "normal" }
    }

    if (usageRatio < 1) {
      return { allowed: true, mode: "warning" }
    }

    if (usageRatio < 1.5) {
      return { allowed: true, mode: "degraded" }
    }

    // 🔥 MUY IMPORTANTE → sigue permitido
    return {
      allowed: true,
      mode: "overage"
    }
  }

  /* fallback */
  return { allowed: true, mode: "normal" }
}

function detectUpgradeSignal({ usage, cost, plan, messages, conversations }) {

  // FREE → PRO
  if (plan === "free") {

    if (usage > 80) return "upgrade_soft"

    if (messages > 50 || conversations > 10) {
      return "upgrade_soft"
    }
  }

  // PRO → BUSINESS
  if (plan === "pro") {

    if (cost > 8) return "upgrade_strong"

    if (messages > 800) {
      return "upgrade_strong"
    }
  }

  return null
}

/* --- middleware --- */

app.use(cors());
app.use("/billing/webhook", express.raw({ type: "application/json" }))
app.use(express.json())

/* --- chat limiter ---*/

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json(
      buildResponse({
        reply: "Too many requests. Please wait a moment."
      })
    )
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
    branding: property.branding,

    address: property.address,
    city: property.city,
    country: property.country,
    postal_code: property.postal_code,
    coordinates: property.coordinates,

    amenities: property.amenities,
    services: property.services
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
    {
      propertyId: user.propertyId,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )

  res.json({
    token,
    propertyId: user.propertyId
  })

});

app.get("/admin/global-metrics", authenticate, requireAdmin, async (req, res) => {

  try {

    const properties = await redis.sMembers("stayassistant:properties")

    let totalRevenue = 0
    let totalCost = 0

    const month = new Date().toISOString().slice(0, 7)

    const propertyStats = []

    for (const propertyId of properties) {

      // ❌ EXCLUDE ADMIN PROPERTY
      const adminEmail = process.env.ADMIN_EMAIL

      const userKey = `stayassistant:user:${propertyId}`
      const userRaw = await redis.get(userKey)

      if (userRaw) {
        const user = JSON.parse(userRaw)

        if (user.email === adminEmail) {
          continue
        }
      }

      // --- COST ---
      const costKey = `stayassistant:cost:${propertyId}:${month}`
      const costData = await redis.hGetAll(costKey)

      const cost = Number(costData.cost || 0)

      // --- SNAPSHOT ---
      const snapshotKey = `stayassistant:billing_snapshot:${propertyId}:${month}`
      const snapshotRaw = await redis.get(snapshotKey)

      // --- UPGRADE SIGNAL
      const signalKey = `stayassistant:upgrade_signal:${propertyId}`
      const upgradeSignal = await redis.get(signalKey)

      let revenue = 0
      let plan = "free"

      if (snapshotRaw) {
        const snap = JSON.parse(snapshotRaw)
        revenue = snap.revenue
        plan = snap.plan
      }

      const profit = revenue - cost

      const margin = revenue > 0 ? (profit / revenue) * 100 : 0

      totalRevenue += revenue
      totalCost += cost

      propertyStats.push({
        propertyId,
        plan,
        revenue,
        cost,
        profit,
        margin,
        profitable: profit >= 0,
        unprofitable: cost > revenue,
        upgradeSignal,
        risk:
          cost > revenue ? "high" :
            margin < 30 ? "medium" :
              "low"
      })

      console.log("ADMIN CHECK:", {
        userEmail: req.userEmail,
        adminEmail: process.env.ADMIN_EMAIL
      })
    }

    // --- SORT (TOP / WORST) ---
    propertyStats.sort((a, b) => b.profit - a.profit)

    res.json({
      total_properties: properties.length,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalRevenue - totalCost,
      properties: propertyStats
    })

  } catch (err) {

    console.error("Admin metrics error", err)

    res.status(500).json({ error: "admin metrics failed" })

  }

})

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many token requests" }
});

app.post("/chat/token", tokenLimiter, async (req, res) => {

  const { propertyId, visitorId } = req.body;

  if (!visitorId) {
    return res.status(400).json({ error: "visitorId required" });
  }

  const origin = req.headers.origin || "";

  if (
    !origin.includes("stayassistantai.com") &&
    !origin.includes("localhost")
  ) {
    return res.status(403).json({ error: "Invalid origin" });
  }

  if (!propertyId) {
    return res.status(400).json({ error: "propertyId required" });
  }

  // opcional pero recomendado
  const property = await loadProperty(propertyId);

  if (!property) {
    return res.status(404).json({ error: "property not found" });
  }

  const token = jwt.sign(
    {
      propertyId,
      visitorId,
      type: "chat"
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({ token });
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
    {
      propertyId,
      email
    },
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

/* --- UPDATE FAQ (FIXED) --- */
app.post("/property/:id/faq", authenticate, async (req, res) => {

  const propertyId = req.params.id

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const { faq } = req.body

  console.log("📥 FAQ RECEIVED:", faq)

  // ✅ VALIDACIÓN
  if (!Array.isArray(faq)) {
    return res.status(400).json({ error: "Invalid FAQ format" })
  }

  if (faq.length === 0) {
    return res.status(400).json({ error: "FAQ cannot be empty" })
  }


  // ✅ LIMPIEZA
  const cleanFaq = faq.filter(f =>
    f.question && f.answer
  )

  if (cleanFaq.length === 0) {
    return res.status(400).json({ error: "Invalid FAQ content" })
  }

  // 🔥 CAMBIO CRÍTICO → usar loadProperty
  const property = await loadProperty(propertyId)

  if (!property) {
    return res.status(404).json({ error: "property not found" })
  }

  // 🔒 PROTECCIÓN EXTRA
  if (!property.knowledge) {
    property.knowledge = {}
  }

  property.knowledge.faq = cleanFaq
  property.updatedAt = Date.now()

  await createProperty(property)

  // 🧹 limpieza cache
  propertyCache.delete(propertyId)
  await invalidateAnalyticsCache(propertyId)

  triggerPrecompute(propertyId)

  console.log("📤 FAQ SAVED:", cleanFaq)

  res.json({ success: true })
})

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

  triggerPrecompute(propertyId)

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
    wifi_password,

    phone,
    email,
    welcome_message
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
    wifi_password,

    phone,
    email,
    welcome_message
  }

  property.updatedAt = Date.now()

  await createProperty(property)

  // limpiar cache
  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  triggerPrecompute(propertyId)

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

  propertyCache.delete(propertyId) // 🔥 CRÍTICO
  const property = await loadProperty(propertyId)

  if (!property) {
    return res.json({ recommendations: [] })
  }

  res.json({
    recommendations: (property.knowledge.local_recommendations || []).map(r => {

      if (typeof r === "string") {
        return { name: r, description: "" }
      }

      return r
    })
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

  //property.knowledge.local_recommendations = recommendations
  property.knowledge.local_recommendations = (recommendations || []).map(r => {

    if (typeof r === "string") {
      return {
        name: r,
        description: ""
      }
    }

    return r
  })

  property.updatedAt = Date.now()

  await createProperty(property)

  propertyCache.delete(propertyId)

  await invalidateAnalyticsCache(propertyId)

  triggerPrecompute(propertyId)

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

function buildResponse({
  reply = "",
  intent = null,
  places = null,
  upgrade = null,
  limit_reached = false,
  error = false
}) {
  return {
    reply,
    intent,
    places,
    upgrade,
    limit_reached,
    error
  }
}

/* --- chat endpoint --- */
app.post("/chat", chatLimiter, async (req, res) => {

  try {

    const userMessage = req.body.message || "";

    // 🔐 CHAT TOKEN VALIDATION
    const chatToken =
      req.headers["x-chat-token"] ||
      req.headers.authorization?.split(" ")[1]

    if (!chatToken) {
      return res.status(401).json(
        buildResponse({
          reply: "Unauthorized",
          error: true
        })
      )
    }

    let decoded

    try {
      decoded = jwt.verify(chatToken, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json(
        buildResponse({
          reply: "Invalid token",
          error: true
        })
      )
    }

    if (decoded.type !== "chat") {
      return res.status(401).json(
        buildResponse({
          reply: "Invalid token type",
          error: true
        })
      )
    }

    const propertyId = decoded.propertyId

    const visitorId = req.body.visitorId;

    if (!visitorId || decoded.visitorId !== visitorId) {
      return res.status(401).json(
        buildResponse({
          reply: "Invalid visitor",
          error: true
        })
      )
    }

    // 🛡️ ANTI-SPAM POR VISITOR (AISLADO)
    const visitorUsageKey = `stayassistant:visitor_usage:${propertyId}:${decoded.visitorId}`;

    const visitorUsage = await redis.incr(visitorUsageKey);

    if (visitorUsage === 1) {
      await redis.expire(visitorUsageKey, 60 * 60); // 1h
    }

    if (visitorUsage > 50) {
      return res.status(429).json(
        buildResponse({
          reply: "Too many messages",
          error: true
        })
      )
    }



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

    // 🧠 MICRO MEMORY KEY (AHORA SÍ)
    const memoryKey = `stayassistant:memory:${propertyId}:${conversationId}`

    // 🧠 GLOBAL USER PROFILE (persistente)
    const profileKey = `stayassistant:profile:${propertyId}:${conversationId}`

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

        return res.json(
          buildResponse({
            reply: "Thanks for trying StayAssistant 😊 This demo has a limited number of questions, but I hope it helped you get a feel for it.",
            intent: null,
            limit_reached: true
          })
        )

      }

      await redis.incr(demoKey)

      await redis.expire(demoKey, 60 * 60 * 24) // 24h

    }

    /* --- MONTHLY USAGE BUCKET --- */
    const month = new Date().toISOString().slice(0, 7)
    const usageKey = `stayassistant:usage:${propertyId}:${month}`

    // --- PLAN ---
    const sub = await getRealSubscription(propertyId)

    let plan = sub.plan || "free"

    /* --- INTENT DETECTION --- */
    const intent = detectIntent(userMessage)
    console.log("🔥 INTENT DETECTED:", intent)


    const addressParts = [
      property.address,
      property.postal_code,
      property.city,
      property.country
    ].filter(Boolean)

    const fullAddress = addressParts.join(", ")

    if (intent === "address") {

      if (!property.address) {
        return res.json(
          buildResponse({
            reply: "The address is not available yet. Please contact the property.",
            intent
          })
        )
      }

      return res.json(
        buildResponse({
          reply: fullAddress,
          intent
        })
      )
    }

    // 🛡️ UNIFIED CONTROL ENGINE
    const control = await checkUsageAndCost(propertyId)

    if (!control.allowed) {
      return res.json(
        buildResponse({
          reply: "I’ve shared as much as I can for now 😊 For more help, you can contact the property directly or try again later.",
          intent: null,
          limit_reached: true
        })
      )
    }

    if (!property) {
      return res.json(
        buildResponse({
          reply: "Property configuration not found.",
          error: true
        })
      )
    }



    const text = userMessage.toLowerCase()

    const wantsPublicTransport =
      text.includes("public") ||
      text.includes("bus") ||
      text.includes("metro") ||
      text.includes("train") ||
      text.includes("transporte público") ||
      text.includes("autobús")

    const isAirport =
      text.includes("airport") ||
      text.includes("aeropuerto") ||
      text.includes("flug") // alemán básico

    // 🔥 FIX 5 — PRIORIDAD RESTAURANTS (SIN AI)
    if (intent === "restaurants") {

      console.log("🍽️ DIRECT RESTAURANTS FLOW")

      try {

        const url = `${req.protocol}://${req.get("host")}/property/${propertyId}/places/restaurants`

        const response = await fetch(url)
        const data = await response.json()

        return res.json(
          buildResponse({
            reply: "Here are some great places nearby 😊",
            intent,
            places: data.items?.length ? data.items : null
          })
        )

      } catch (err) {

        console.log("Places fetch error:", err)

        return res.json(
          buildResponse({
            reply: "I can recommend great places nearby 😊 Do you prefer local food, something quick, or a nice restaurant?",
            intent
          })
        )

      }
    }

    /* --- DIRECT PLACES FLOW (NEW) --- */

    const placeIntentMap = {
      supermarket: "supermarket",
      pharmacy: "pharmacy",
      cafes: "cafes",
      bars: "bars",
      parks: "parks",
      activities: "activities",
      public_transport: "public_transport"
    }

    if (placeIntentMap[intent]) {

      console.log("📍 DIRECT PLACES FLOW:", intent)

      try {

        const url = `${req.protocol}://${req.get("host")}/property/${propertyId}/places/${placeIntentMap[intent]}`

        const response = await fetch(url)
        const data = await response.json()

        return res.json(
          buildResponse({
            reply: "Here are some useful places nearby 😊",
            intent,
            places: data.items?.length ? data.items : null
          })
        )

      } catch (err) {

        console.log("Places fetch error:", err)

        return res.json(
          buildResponse({
            reply: "I couldn't load nearby places right now, but I can still recommend restaurants, cafes, or activities 😊 What would you like?",
            intent
          })
        )

      }
    }

    const allowedAIIntents = ["other", "activities"]

    if (!allowedAIIntents.includes(intent)) {
      console.log("🚫 AI BLOCKED FOR INTENT:", intent)
    }

    if (
      intent === "other" &&
      userMessage.length < 20 &&
      !userMessage.includes("?")
    ) {
      return res.json(
        buildResponse({
          reply: "I can help with your stay 😊 Try asking something like 'WiFi password', 'check-in time', or 'restaurants nearby'.",
          intent
        })
      )
    }

    /* --- INTENT DIRECT RESPONSE (COST SHIELD) --- */

    if (intent === "taxi") {

      return res.json(
        buildResponse({
          reply: "I can help you arrange a taxi 😊 Where do you need to go?",
          intent
        })
      )

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

      return res.json(
        buildResponse({
          reply: answer,
          intent
        })
      )
    }

    if (intent === "waste") {

      const info = property.knowledge.property_info

      if (!info.waste) {
        return res.json(
          buildResponse({
            reply: "Please check with reception for waste disposal instructions.",
            intent
          })
        )
      }

      return res.json(
        buildResponse({
          reply: info.waste,
          intent
        })
      )
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

      return res.json(
        buildResponse({
          reply: answer,
          intent
        })
      )
    }

    if (intent === "checkout") {
      const info = property.knowledge.property_info

      let answer = `Check-out: ${info.checkout}.`

      if (info.checkin) {
        answer += ` Check-in starts at ${info.checkin}.`
      }

      return res.json(
        buildResponse({
          reply: answer,
          intent
        })
      )
    }


    if (intent === "transport") {

      // 🎯 AEROPUERTO + TRANSPORTE PÚBLICO
      if (isAirport && wantsPublicTransport) {

        return res.json(
          buildResponse({
            reply:
              "You can usually get to the airport by bus 😊 Routes vary depending on your location, so I recommend checking Google Maps for the best option.",
            intent
          })
        )
      }

      // 🎯 AEROPUERTO NORMAL
      if (isAirport) {

        return res.json(
          buildResponse({
            reply:
              "The easiest way to get to the airport is by taxi 😊 You can use Uber or a local taxi service.",
            intent
          })
        )
      }

      // 🎯 GENERAL + TRANSPORTE PÚBLICO
      if (wantsPublicTransport) {

        return res.json(
          buildResponse({
            reply:
              "You can usually get there by bus or public transport 😊 I recommend checking Google Maps for the best route.",
            intent
          })
        )
      }

      // 🎯 GENERAL
      return res.json(
        buildResponse({
          reply:
            "Where do you need to go? I’ll suggest the best option 😊",
          intent
        })
      )
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

    // 🧠 LOAD MEMORY
    let memoryRaw = await redis.get(memoryKey)

    // 🧠 LOAD USER PROFILE
    let profileRaw = await redis.get(profileKey)

    let userProfile = profileRaw ? JSON.parse(profileRaw) : {
      preferences: [],
      budget: null,
      travelType: null,
      interests: [],
      interactionCount: 0,
      lastSeen: Date.now()
    }

    let memory = memoryRaw ? JSON.parse(memoryRaw) : {
      lastIntent: null,
      lastTopic: null,
      preferences: [],
      budget: null,
      travelContext: null,
      lastEntities: [],
      conversationStyle: "neutral"
    }

    // 🧠 ADVANCED MEMORY EXTRACTION

    const msgLower = userMessage.toLowerCase()

    // presupuesto
    if (msgLower.includes("cheap") || msgLower.includes("budget")) {
      memory.budget = "low"
    }

    if (msgLower.includes("luxury") || msgLower.includes("expensive")) {
      memory.budget = "high"
    }

    // tipo comida
    if (msgLower.includes("vegan")) memory.preferences.push("vegan")
    if (msgLower.includes("seafood")) memory.preferences.push("seafood")

    // contexto viaje
    if (msgLower.includes("honeymoon")) memory.travelContext = "romantic"
    if (msgLower.includes("family")) memory.travelContext = "family"

    // estilo conversación
    if (msgLower.includes("quick")) memory.conversationStyle = "short"
    if (msgLower.includes("detailed")) memory.conversationStyle = "detailed"

    // limpiar duplicados
    memory.preferences = [...new Set(memory.preferences)]

    // 🧠 SIMPLE PREFERENCE DETECTION
    const msg = userMessage.toLowerCase()

    if (msg.includes("cheap")) memory.preferences.push("cheap")
    if (msg.includes("expensive")) memory.preferences.push("expensive")
    if (msg.includes("seafood")) memory.preferences.push("seafood")
    if (msg.includes("vegan")) memory.preferences.push("vegan")
    if (msg.includes("near")) memory.preferences.push("nearby")

    // 🧠 FOLLOW-UP DETECTION
    if (
      intent === "other" &&
      memory.lastIntent === "restaurants"
    ) {
      console.log("🧠 FOLLOW-UP → RESTAURANTS CONTEXTUAL")

      let reply = "Here are some great options"

      if (memory.budget === "low") {
        reply += " that are budget-friendly"
      }

      if (memory.preferences.length) {
        reply += ` with ${memory.preferences.join(", ")} options`
      }

      reply += ":"

      return res.json(
        buildResponse({
          reply,
          intent
        })
      )
    }

    console.log("🧠 INTENT:", intent, "| MSG:", userMessage)

    history = history ? JSON.parse(history) : [];

    const lastUserMessage = history
      .filter(m => m.role === "user")
      .slice(-1)[0]?.content

    if (lastUserMessage && lastUserMessage === userMessage) {

      console.log("⚠️ DUPLICATE MESSAGE BLOCKED")

      return res.json(
        buildResponse({
          reply: "Let me add a bit more detail to help you 👇",
          language: userLanguage
        })
      )
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
        .replace(/\b(what|is|the|please|can|you|tell|me|how|where|when|i|we)\b/g, "")
        .replace(/\s+/g, " ")
        .trim()

    }

    const normalizedQuestion = normalizeMessage(userMessage)

    /* --- AISLAMIENTO MULTI-TENANT --- */
    const cacheKey = `stayassistant:cache:${propertyId}:${intent}:${normalizedQuestion}:${property.updatedAt || "v1"}:${control.mode}`

    /* --- FAQ AUTO ANSWER --- */
    function similarity(a, b) {
      const aWords = a.split(" ")
      const bWords = b.split(" ")

      const matchCount = aWords.filter(word =>
        bWords.includes(word)
      ).length

      return matchCount / Math.max(aWords.length, bWords.length)
    }

    let bestMatch = null
    let bestScore = 0

    for (const f of property.knowledge.faq) {

      const normalizedFaq = normalizeMessage(f.question)
      const similarityScore = similarity(normalizedQuestion, normalizedFaq)
      const faqIntent = detectIntent(f.question)

      // 🎯 prioridad fuerte: match de intent + alta similitud
      if (faqIntent === intent && similarityScore > bestScore) {
        bestMatch = f
        bestScore = similarityScore
      }

    }

    // 🔥 threshold dinámico
    if (bestMatch && bestScore > 0.7) {

      console.log("✅ FAQ MATCH STRONG:", bestScore)

      history.push({
        role: "assistant",
        content: bestMatch.answer
      })

      await redis.set(historyKey, JSON.stringify(history), {
        EX: 60 * 60 * 24 * 7
      })

      return res.json(
        buildResponse({
          reply: bestMatch.answer,
          intent
        })
      )
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

      return res.json(
        buildResponse({
          reply: cachedReply,
          intent
        })
      )
    }



    /* --- AI GUARD (SMART FALLBACK) --- */

    const shouldUseAI =
      intent === "other" ||
      intent === "activities"

    if (!shouldUseAI) {

      console.log("🚫 AI STRICT BLOCK:", intent)

      return res.json(
        buildResponse({
          reply: "I can help with things like check-in, WiFi, restaurants, or transport 😊 What do you need?",
          intent
        })
      )
    }

    /* --- KNOWLEDGE SELECTION (AI Brain V2) --- */

    const knowledge = selectKnowledge(property, intent, memory)


    /* --- KNOWLEDGE QUALITY CHECK --- */
    if (!knowledge || knowledge.length < 10) {

      console.log("🚫 AI BLOCKED (low knowledge)")

      return res.json(
        buildResponse({
          reply: "I'm not sure about that yet, but I can help with your stay 😊 You can ask about WiFi, check-in, or nearby places.",
          intent
        })
      )
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

    const isDegraded = control.mode === "degraded"
    const isWarning = control.mode === "warning"

    try {

      console.log("🤖 CALLING OPENAI:", intent)
      console.log("📊 KNOWLEDGE LENGTH:", knowledge?.length)
      console.log("⚙️ MODE:", control.mode)

      completion = await Promise.race([


        openai.chat.completions.create({

          model: "gpt-4o-mini",

          max_tokens: isDegraded ? 60 : 120,
          temperature: isDegraded ? 0.2 : 0.4,

          messages: [
            {
              role: "system",
              content:
                buildPrompt(
                  property,
                  userLanguage,
                  context,
                  knowledge,
                  memory,
                  history,
                  userProfile
                ) +
                (isDegraded ? "\n\nBe concise and short." : "") +
                (isWarning ? "\n\nKeep responses helpful but slightly concise." : "") +
                "\n\n--- LIVE DATA ---\n" +
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

      return res.json(
        buildResponse({
          reply: "I'm sorry, I'm having trouble answering right now. Please try again in a moment.",
          intent,
          error: true
        })
      )

    }

    const reply = completion.choices[0].message.content;

    // ✨ HUMANIZER LAYER

    let finalReply = reply.trim()

    if (!finalReply.endsWith(".")) {
      finalReply += "."
    }

    // evitar tono robótico
    finalReply = finalReply
      .replace("Here are some options:", "Here are a few great options you might like:")
      .replace("I recommend", "I'd suggest")

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

        const cost = Number(
          (
            (inputTokens / 1000) * 0.00015 +
            (outputTokens / 1000) * 0.0006
          ).toFixed(6)
        )

        const costKey = `stayassistant:cost:${propertyId}:${month}`

        // 💾 BILLING SNAPSHOT (MONTHLY)

        const snapshotKey = `stayassistant:billing_snapshot:${propertyId}:${month}`

        const snapshotExists = await redis.get(snapshotKey)

        if (!snapshotExists) {

          const subKey = `stayassistant:subscription:${propertyId}`

          const subRaw = await redis.get(subKey)

          let plan = "free"

          if (subRaw) {
            const sub = JSON.parse(subRaw)
            plan = sub.plan || "free"
          }

          const revenue = getPlanPrice(plan)

          await redis.set(snapshotKey, JSON.stringify({
            plan,
            revenue,
            createdAt: Date.now()
          }))

          console.log("📸 SNAPSHOT CREATED:", propertyId, month)
        }

        await redis.hIncrByFloat(costKey, "cost", cost)
        await redis.hIncrBy(costKey, "input_tokens", inputTokens)
        await redis.hIncrBy(costKey, "output_tokens", outputTokens)

        // 🚨 PROFIT CHECK (REAL-TIME)

        try {

          const subKey = `stayassistant:subscription:${propertyId}`

          const subRaw = await redis.get(subKey)

          let plan = "free"

          if (subRaw) {
            const sub = JSON.parse(subRaw)
            plan = sub.plan || "free"
          }

          const revenue =
            plan === "pro" ? 29 :
              plan === "business" ? 99 :
                0

          const totalCost = await redis.hGet(costKey, "cost")

          const alertKey = `stayassistant:alerted:${propertyId}:${month}`

          const alreadyAlerted = await redis.get(alertKey)

          if (Number(totalCost || 0) > revenue && !alreadyAlerted) {

            console.log("🚨 UNPROFITABLE PROPERTY:", propertyId)

            await redis.set(alertKey, "1", { EX: 60 * 60 * 6 }) // 6h cooldown
          }


        } catch (err) {
          console.log("Profit check error:", err)
        }

        console.log("💰 COST SAVED:", costKey)

      }

    } catch (err) {
      console.log("Cost tracking error:", err)
    }

    try {
      await redis.incr(usageKey)

      // 💰 OVERAGE TRACKING REAL

      const limit = await getUsageLimit(propertyId)

      const currentUsage = Number(await redis.get(usageKey) || 0)

      if (currentUsage > limit && plan !== "free") {

        const overageKey = `stayassistant:overage:${propertyId}:${month}`

        const priceKey = `stayassistant:overage_price:${propertyId}`

        let price = Number(await redis.get(priceKey))

        if (!price) {
          price = getOveragePrice(plan) // fallback safety
        }

        await redis.hIncrBy(overageKey, "messages", 1)

        await redis.hIncrByFloat(overageKey, "cost", price)

        console.log("💰 Overage tracked:", {
          propertyId,
          price
        })

        console.log("📊 Usage:", currentUsage, "/", limit)
      }

      // 💰 STRIPE METER EVENTS (NUEVO - CORRECTO)
      try {

        const subKey = `stayassistant:subscription:${propertyId}`
        const subRaw = await redis.get(subKey)

        if (subRaw) {

          const sub = JSON.parse(subRaw)

          // 💡 LOAD METERED ITEM CACHE (DEBUG PRO)
          const itemCacheKey = `stayassistant:metered_item:${propertyId}`

          const meteredItemId = await redis.get(itemCacheKey)

          if (!meteredItemId) {
            console.log("⚠️ No cached metered item (not blocking)")
          } else {
            console.log("💡 Using metered item:", meteredItemId)
          }

          console.log("🧾 Stripe customer:", sub.stripeCustomer)
          console.log("📊 Plan:", plan)

          if (
            plan !== "free" &&
            sub.status === "active" &&
            sub.stripeCustomer &&
            !sub.stripeCustomer.startsWith("guest")
          ) {

            console.log("📡 Sending meter event:", sub.stripeCustomer)

            await stripe.billing.meterEvents.create({
              event_name: "messages",
              payload: {
                stripe_customer_id: sub.stripeCustomer,
                value: 1
              }
            }, {
              idempotencyKey: `${propertyId}-${conversationId}-${Date.now()}`
            })

            console.log("✅ Meter event sent")

          } else {
            console.log("⚠️ Meter skipped:", {
              plan,
              status: sub.status
            })
          }

        } else {
          console.log("⚠️ No subscription in Redis")
        }

      } catch (err) {
        console.log("Stripe meter error:", err.message)
      }


      // 🧠 BEHAVIOR TRACKING

      const engagementKey = `stayassistant:engagement:${propertyId}`

      // total mensajes
      await redis.hIncrBy(engagementKey, "messages", 1)

      // conversaciones únicas
      const isNewConversation = history.length === 1

      if (isNewConversation) {
        await redis.hIncrBy(engagementKey, "conversations", 1)
      }

      // guardar última actividad
      await redis.hSet(engagementKey, "last_activity", Date.now())

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

    const shortReply = isDegraded
      ? cleanReply.slice(0, 250)
      : cleanReply.slice(0, 500)

    // --- UPGRADE SIGNAL ---
    const usage = Number(await redis.get(usageKey) || 0)
    const cost = Number(await redis.hGet(`stayassistant:cost:${propertyId}:${month}`, "cost") || 0)

    const engagementKey = `stayassistant:engagement:${propertyId}`
    const engagement = await redis.hGetAll(engagementKey)

    const messages = Number(engagement.messages || 0)
    const conversations = Number(engagement.conversations || 0)

    const revenue =
      plan === "pro" ? 39 :
        plan === "business" ? 99 :
          0

    const score = computeCustomerScore({
      usage,
      cost,
      revenue,
      messages,
      conversations,
      plan
    })

    const strategy = getUpgradeStrategy(score, plan)

    const key = `stayassistant:ltv:${propertyId}`

    // 💾 guardar score completo
    await redis.set(key, JSON.stringify({
      score,
      strategy,
      updatedAt: Date.now()
    }), {
      EX: 60 * 60 * 6
    })

    // 🔥 legacy compatibility (NO ROMPER NADA)
    if (strategy?.type) {
      await redis.set(`stayassistant:upgrade_signal:${propertyId}`, strategy.type, {
        EX: 60 * 60 * 6
      })
    } else {
      await redis.del(`stayassistant:upgrade_signal:${propertyId}`)
    }

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
      content: finalReply
    });

    if (history.length > 6) {
      history = history.slice(-6);
    }

    await redis.set(historyKey, JSON.stringify(history), {
      EX: 60 * 60 * 24 * 7
    });

    // 🎯 UPGRADE TRIGGER MOMENT (SMART)

    let upgradeTrigger = false

    if (strategy) {

      if (strategy.urgency === "high") {
        upgradeTrigger = true
      }

      if (
        strategy.type === "soft" &&
        messages > 5 &&           // engaged user
        conversations > 1         // not first visit
      ) {
        upgradeTrigger = true
      }

    }

    // 🧠 PROFILE ENRICHMENT (V3)

    // incrementar interacción
    userProfile.interactionCount += 1
    userProfile.lastSeen = Date.now()

    // sincronizar con memory
    if (memory.budget) {
      userProfile.budget = memory.budget
    }

    if (memory.preferences?.length) {
      userProfile.preferences = [
        ...new Set([...userProfile.preferences, ...memory.preferences])
      ]
    }

    // detectar intereses
    if (intent === "restaurants") {
      userProfile.interests.push("food")
    }

    if (intent === "activities") {
      userProfile.interests.push("activities")
    }

    // limpiar duplicados
    userProfile.interests = [...new Set(userProfile.interests)]

    // 💰 VALUE SIGNAL SIMPLE (pre-LTV)
    let userValueScore = 0

    if (userProfile.interactionCount > 5) userValueScore += 1
    if (userProfile.preferences.length > 1) userValueScore += 1
    if (userProfile.interests.includes("food")) userValueScore += 1

    if (userValueScore >= 2) {
      console.log("💰 HIGH VALUE USER")
    }

    // 🧠 UPDATE MEMORY
    memory.lastIntent = intent

    if (intent !== "other") {
      memory.lastTopic = intent
    }

    // guardar entidades simples
    memory.lastEntities = [
      ...memory.lastEntities.slice(-3),
      userMessage
    ]

    if (intent === "restaurants" || intent === "activities") {
      memory.lastTopic = intent
    }

    // evitar duplicados simples
    memory.preferences = [...new Set(memory.preferences)]

    // guardar en redis
    await redis.set(memoryKey, JSON.stringify(memory), {
      EX: 60 * 60 * 24
    })

    // 🧠 SAVE USER PROFILE (V3)
    await redis.set(profileKey, JSON.stringify(userProfile), {
      EX: 60 * 60 * 24 * 30 // 30 días
    })

    res.json(
      buildResponse({
        reply: shortReply,
        intent,
        upgrade: upgradeTrigger
          ? {
            type: strategy?.type,
            urgency: strategy?.urgency,
            message: strategy?.message
          }
          : null
      })
    )

  } catch (error) {

    console.error("OpenAI error:", error);

    res.status(500).json(
      buildResponse({
        reply: "Sorry, something went wrong.",
        error: true
      })
    )

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

/* --- DASHBOARD OVERVIEW --- */
app.get("/api/dashboard/overview", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId
    const month = new Date().toISOString().slice(0, 7)

    /* -----------------------------
       1. KPI CORE (YA EXISTENTE)
    ----------------------------- */

    const usageKey = `stayassistant:usage:${propertyId}:${month}`
    const costKey = `stayassistant:cost:${propertyId}:${month}`
    const snapshotKey = `stayassistant:billing_snapshot:${propertyId}:${month}`

    const usage = Number(await redis.get(usageKey) || 0)
    const costData = await redis.hGetAll(costKey)
    const cost = Number(costData.cost || 0)

    const usageLimit = await getUsageLimit(propertyId)

    const snapshotRaw = await redis.get(snapshotKey)

    let revenue = 0
    let plan = "free"

    if (snapshotRaw) {
      const snap = JSON.parse(snapshotRaw)
      revenue = snap.revenue
      plan = snap.plan
    }

    const profit = revenue - cost
    const usagePct = usageLimit ? (usage / usageLimit) : 0

    /* -----------------------------
       2. INSIGHTS (CACHE YA EXISTE)
    ----------------------------- */

    const semanticRaw = await redis.get(`stayassistant:semantic:${propertyId}`)
    const aiRaw = await redis.get(`stayassistant:ai_insights:${propertyId}`)

    const semantic = semanticRaw ? JSON.parse(semanticRaw).insights : []
    const ai = aiRaw ? JSON.parse(aiRaw).insights : []

    const insights = [...semantic, ...ai].slice(0, 4)

    /* -----------------------------
       3. ALERTS (REUTILIZAR LÓGICA)
    ----------------------------- */

    const intentKey = `stayassistant:analytics:${propertyId}:questions`
    const intents = await redis.zRangeWithScores(intentKey, 0, 2, { REV: true })

    const alerts = []

    const top = intents[0]

    if (top && top.score >= 10) {
      alerts.push({
        type: "demand",
        text: `High demand for "${top.value}"`
      })
    }

    /* -----------------------------
       4. ACTIONS (NUEVO - SIMPLE)
    ----------------------------- */

    const actions = []

    if (top && top.value === "restaurants" && top.score >= 5) {
      actions.push({
        type: "faq",
        text: "Add restaurant FAQ to improve conversions",
        impact: "high"
      })
    }

    if (usagePct > 0.8) {
      actions.push({
        type: "usage",
        text: "You're close to your limit. Consider upgrading.",
        impact: "high"
      })
    }

    /* -----------------------------
       5. UPGRADE SIGNAL (YA EXISTE)
    ----------------------------- */

    const upgradeRaw = await redis.get(`stayassistant:ltv:${propertyId}`)

    let upgrade = null

    if (upgradeRaw) {
      const parsed = JSON.parse(upgradeRaw)
      upgrade = parsed.strategy || null
    }

    /* -----------------------------
       RESPONSE FINAL
    ----------------------------- */

    res.json({
      kpis: {
        messages: usage,
        usage_limit: usageLimit,
        usage_pct: Number(usagePct.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        revenue,
        profit: Number(profit.toFixed(2))
      },
      insights,
      alerts,
      actions,
      upgrade
    })

  } catch (err) {

    console.error("Overview error:", err)

    res.status(500).json({
      error: "overview_failed"
    })

  }

})

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

    triggerPrecompute(propertyId)

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

    triggerPrecompute(propertyId)

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

    let json

    try {
      json = JSON.parse(text)
    } catch {
      return res.status(500).json({ error: "invalid AI response" })
    }

    property.knowledge.faq = json.faq

    //property.knowledge.local_recommendations = json.recommendations

    property.knowledge.local_recommendations = (json.recommendations || []).map(r => {

      if (typeof r === "string") {
        return {
          name: r,
          description: ""
        }
      }

      return r
    })

    property.knowledge.property_info.checkin = checkin
    property.knowledge.property_info.checkout = checkout

    property.updatedAt = Date.now()

    await createProperty(property)

    propertyCache.delete(propertyId)

    await invalidateAnalyticsCache(propertyId)

    triggerPrecompute(propertyId)

    /* --- ONBOARDING AUTO COMPLETE (FIX UX) --- */

    const onboardingKey = `stayassistant:onboarding:${propertyId}`

    let onboarding = await redis.get(onboardingKey)

    onboarding = onboarding ? JSON.parse(onboarding) : {}

    onboarding.recommendations = true
    onboarding.faq = true

    await redis.set(onboardingKey, JSON.stringify(onboarding))

    /* --- END FIX --- */

    res.json({ success: true })

  } catch (err) {

    console.error("AI setup error", err)

    res.status(500).json({ error: "setup failed" })

  }

})

app.post("/ai/setup-generator", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    const city = property.city || "a tourist city"

    const prompt = `
    Create a full concierge setup for a vacation rental in ${city}.

    Return STRICT JSON:

    {
      "property_info": {
        "welcome_message": "...",
        "checkin": "15:00",
        "checkout": "11:00"
      },
      "faq": [
        { "question": "...", "answer": "..." }
      ],
      "recommendations": [
        { "name": "...", "description": "..." }
      ]
    }
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: "You generate structured JSON only." },
        { role: "user", content: prompt }
      ]
    })

    let data

    try {
      data = JSON.parse(completion.choices[0].message.content)
    } catch (err) {
      console.log("JSON parse error", err)
      return res.status(500).json({ error: "invalid AI response" })
    }

    res.json(data)

  } catch (err) {

    console.error("AI generator error", err)

    res.status(500).json({ error: "generator failed" })
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
      postal_code,
      amenities,
      services
    } = req.body


    const property = await getProperty(propertyId)

    if (!property) {
      return res.status(404).json({ error: "property not found" })
    }

    property.postal_code = postal_code

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

    triggerPrecompute(propertyId)

    res.json({
      success: true,
      coordinates: property.coordinates
    })

  } catch (err) {

    console.error("Property setup error", err)

    res.status(500).json({ error: "setup failed" })

  }

})

/* --- BILLING FORECAST --- */
app.get("/billing/forecast/:propertyId", authenticate, async (req, res) => {

  const { propertyId } = req.params

  if (req.propertyId !== propertyId) {
    return res.status(403).json({ error: "forbidden" })
  }

  const usageLimit = await getUsageLimit(propertyId)

  const month = new Date().toISOString().slice(0, 7)

  const usage = Number(await redis.get(`stayassistant:usage:${propertyId}:${month}`) || 0)

  const costData = await redis.hGetAll(`stayassistant:cost:${propertyId}:${month}`)
  const cost = Number(costData.cost || 0)

  const overageData = await redis.hGetAll(`stayassistant:overage:${propertyId}:${month}`)
  const overageCost = Number(overageData.cost || 0)

  const sub = await getRealSubscription(propertyId)

  let plan = sub.plan || "free"

  const basePrice = getPlanPrice(plan)

  const total = basePrice + overageCost

  // 🔥 LOAD UPGRADE SIGNAL
  const upgradeRaw = await redis.get(`stayassistant:ltv:${propertyId}`)

  let upgrade = null

  if (upgradeRaw) {
    const parsed = JSON.parse(upgradeRaw)

    if (parsed?.strategy) {
      upgrade = parsed.strategy
    }
  }

  res.json({
    plan,
    base_price: basePrice,
    usage,
    usage_limit: usageLimit,
    cost,
    overage_cost: overageCost,
    estimated_total: total,
    upgrade // 🔥 NEW
  })


})

/* --- COST TRACKING --- */
app.get("/analytics/:propertyId/costs", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const month = new Date().toISOString().slice(0, 7)

    const costKey = `stayassistant:cost:${propertyId}:${month}`

    const data = await redis.hGetAll(costKey)

    const cost = Number(data.cost || 0)
    const inputTokens = Number(data.input_tokens || 0)
    const outputTokens = Number(data.output_tokens || 0)

    const usageKey = `stayassistant:usage:${propertyId}:${month}`
    const messages = Number(await redis.get(usageKey) || 0)

    const costPerMessage = messages > 0 ? cost / messages : 0

    // 💾 LOAD SNAPSHOT (MONTHLY)

    const snapshotKey = `stayassistant:billing_snapshot:${propertyId}:${month}`

    const snapshotRaw = await redis.get(snapshotKey)

    let plan = "free"
    let revenue = 0

    if (snapshotRaw) {

      const snapshot = JSON.parse(snapshotRaw)

      plan = snapshot.plan
      revenue = snapshot.revenue

    } else {

      // fallback (por si no existe snapshot)
      const subKey = `stayassistant:subscription:${propertyId}`

      const subRaw = await redis.get(subKey)

      if (subRaw) {
        const sub = JSON.parse(subRaw)
        plan = sub.plan || "free"
      }

      revenue = getPlanPrice(plan)

    }

    const profit = revenue - cost



    res.json({
      plan,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      messages,
      cost_per_message: costPerMessage
    })

  } catch (err) {

    console.error("Cost analytics error", err)

    res.status(500).json({ error: "cost analytics failed" })

  }

})

/* --- UPGRADE SIGNAL --- */
app.get("/analytics/:propertyId/upgrade-signal", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const key = `stayassistant:upgrade_signal:${propertyId}`

    const signal = await redis.get(key)

    res.json({
      upgradeSignal: signal || null
    })

  } catch (err) {

    console.error("Upgrade signal error", err)

    res.json({ upgradeSignal: null })

  }

})

app.get("/analytics/:propertyId/ltv", authenticate, async (req, res) => {

  try {

    const propertyId = req.params.propertyId

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const key = `stayassistant:ltv:${propertyId}`

    const data = await redis.get(key)

    if (!data) {
      return res.json({ ltv: null })
    }

    res.json(JSON.parse(data))

  } catch (err) {

    console.error("LTV fetch error", err)

    res.json({ ltv: null })

  }

})

/* --- BILLING OVERAGE --- */
app.get("/billing/overage/:propertyId", authenticate, async (req, res) => {

  try {

    const { propertyId } = req.params

    if (req.propertyId !== propertyId) {
      return res.status(403).json({ error: "forbidden" })
    }

    const month = new Date().toISOString().slice(0, 7)

    const key = `stayassistant:overage:${propertyId}:${month}`

    const data = await redis.hGetAll(key)

    res.json({
      messages: Number(data.messages || 0),
      cost: Number(data.cost || 0)
    })

  } catch (err) {

    console.error("Overage fetch error", err)

    res.status(500).json({ error: "failed" })

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

    let overagePriceId

    if (plan === "pro") {
      overagePriceId = process.env.STRIPE_PRO_OVERAGE_PRICE_ID
    }

    if (plan === "business") {
      overagePriceId = process.env.STRIPE_BUSINESS_OVERAGE_PRICE_ID
    }

    if (!overagePriceId) {
      console.error("❌ Overage price missing for plan:", plan)
      return res.status(500).json({ error: "overage not configured" })
    }

    const existing = await redis.get(`stayassistant:subscription:${propertyId}`)

    let customerId = null

    if (existing) {
      const sub = JSON.parse(existing)
      customerId = sub.stripeCustomer
    }

    // 🔥 FIX CRÍTICO: cancelar subscripciones activas
    if (customerId) {
      await cancelActiveSubscriptions(customerId)
    }

    console.log("💰 STRIPE DEBUG:", {
      plan,
      basePriceId: priceId,
      overagePriceId
    })

    const session = await stripe.checkout.sessions.create({

      customer: customerId || undefined,

      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1
        },
        {
          price: overagePriceId
        }
      ],

      success_url: "https://www.stayassistantai.com/dashboard/billing/success",

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


app.post("/billing/webhook", async (req, res) => {

  const sig = req.headers["stripe-signature"]

  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.log("❌ Webhook signature failed", err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {

    console.log("🔥 Webhook received:", event.type)

    if (event.type === "checkout.session.completed") {

      const session = event.data.object

      const propertyId = session.metadata.propertyId
      const plan = session.metadata.plan

      let subscription = await stripe.subscriptions.retrieve(
        session.subscription,
        { expand: ["items.data.price"] }
      )

      if (!session.subscription) {
        console.error("❌ NO SUBSCRIPTION IN SESSION")
        return
      }

      console.log("🧾 SUB FULL:", JSON.stringify(subscription, null, 2))

      const items = subscription.items?.data || []

      let overagePriceId

      if (plan === "pro") {
        overagePriceId = process.env.STRIPE_PRO_OVERAGE_PRICE_ID
      }

      if (plan === "business") {
        overagePriceId = process.env.STRIPE_BUSINESS_OVERAGE_PRICE_ID
      }

      let meteredItem = items.find(item =>
        item.price?.id === overagePriceId
      )

      // 🔥 FIX REAL — CREATE METERED IF MISSING
      if (!meteredItem && overagePriceId) {

        console.log("⚠️ Metered item missing → attempting recovery")

        console.log("🔍 Existing items:",
          items.map(i => i.price?.id)
        )

        // 🔒 protección anti-duplicados (muy importante)
        const alreadyExists = items.some(
          i => i.price?.id === overagePriceId
        )

        if (!alreadyExists) {

          const newItem = await stripe.subscriptionItems.create({
            subscription: subscription.id,
            price: overagePriceId
          })

          console.log("✅ Metered item created:", newItem.id)

          const updatedSub = await stripe.subscriptions.retrieve(
            subscription.id,
            { expand: ["items.data.price"] }
          )

          const updatedItems = updatedSub.items?.data || []

          meteredItem = updatedItems.find(
            item => item.price?.id === overagePriceId
          )

        } else {
          console.log("⚠️ Metered item exists but not detected properly")
        }
      }


      if (!meteredItem) {
        console.error("❌ NO METERED ITEM FOUND (WEBHOOK FINAL)")
      } else {
        console.log("💡 METERED PRICE ID:", meteredItem.price.id)
      }

      await saveSubscription(propertyId, {
        plan,
        status: "active",
        stripeCustomer: session.customer,
        stripeSubscription: session.subscription,
      })

      console.log("💡 METERED PRICE ID:", meteredItem?.price?.id)

      if (meteredItem) {

        const itemCacheKey = `stayassistant:metered_item:${propertyId}`

        await redis.set(itemCacheKey, meteredItem.id, {
          EX: 60 * 60 * 24
        })

        console.log("🔥 SAVED SUB ITEM:", meteredItem.id)

        console.log("💾 Metered item cached from webhook")
      }

      // 💰 SAVE REAL OVERAGE PRICE (PRO LEVEL)
      if (meteredItem?.price?.unit_amount) {

        const overagePrice = meteredItem.price.unit_amount / 100

        const priceKey = `stayassistant:overage_price:${propertyId}`

        await redis.set(priceKey, overagePrice)

        console.log("💰 Overage price cached:", overagePrice)
      }

      console.log("✅ Subscription activated:", propertyId)
    }

  } catch (err) {
    console.error("Webhook processing error", err)
  }

  // SUBSCRIPTION DELETED
  if (event.type === "customer.subscription.deleted") {

    const subscription = event.data.object

    const subId = subscription.id

    console.log("🧨 Subscription deleted:", subId)

    // 🔍 Buscar propertyId desde índice
    const indexKey = `stayassistant:subscription_index:${subId}`

    const propertyId = await redis.get(indexKey)

    await redis.del(indexKey)

    if (!propertyId) {
      console.log("❌ No propertyId found for subscription")
      return
    }

    // 💾 Reset a FREE
    await saveSubscription(propertyId, {
      plan: "free",
      status: "canceled"
    })

    // 🧹 limpiar metered item cache
    await redis.del(`stayassistant:metered_item:${propertyId}`)
    await redis.del(`stayassistant:overage_price:${propertyId}`)

    console.log("✅ Subscription downgraded to FREE:", propertyId)
  }

  if (event.type === "customer.subscription.updated") {

    const subscription = event.data.object

    if (subscription.cancel_at_period_end) {

      console.log("⚠️ Subscription will cancel at period end:", subscription.id)

      const indexKey = `stayassistant:subscription_index:${subscription.id}`
      const propertyId = await redis.get(indexKey)

      if (propertyId) {
        await saveSubscription(propertyId, {
          plan: "free",
          status: "cancel_scheduled"
        })
      }
    }
  }

  res.json({ received: true })
})

/* --- GET SUBSCRIPTION --- */
app.get("/billing/subscription", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const sub = await getRealSubscription(propertyId)

    res.json(sub)

  } catch (err) {

    res.status(500).json({ error: "subscription failed" })

  }

})

app.get("/billing/details", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId

    const sub = await getRealSubscription(propertyId)

    if (!sub?.stripeSubscription) {
      return res.json({
        renewal_date: null,
        next_invoice: null
      })
    }

    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripeSubscription
    )

    // 📅 renewal date
    const renewalDate = stripeSub.current_period_end

    // 🧾 next invoice
    let nextInvoice = null

    try {
      const invoice = await stripe.invoices.retrieveUpcoming({
        customer: stripeSub.customer
      })

      nextInvoice = {
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        date: invoice.next_payment_attempt
      }

    } catch (err) {
      console.log("No upcoming invoice")
    }

    res.json({
      renewal_date: renewalDate,
      next_invoice: nextInvoice
    })

  } catch (err) {

    console.error("Billing details error:", err)

    res.status(500).json({ error: "failed" })

  }

})

app.get("/billing/invoices", authenticate, async (req, res) => {

  try {

    const propertyId = req.propertyId
    const sub = await getRealSubscription(propertyId)

    if (!sub?.stripeSubscription) {
      return res.json([])
    }

    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripeSubscription
    )

    const invoices = await stripe.invoices.list({
      customer: stripeSub.customer,
      limit: 10
    })

    const formatted = invoices.data.map(inv => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      date: inv.created,
      status: inv.status,
      pdf: inv.invoice_pdf
    }))

    res.json(formatted)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "failed" })
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

/* CANCEL PLAN */
app.post("/billing/cancel", authenticate, async (req, res) => {

  const propertyId = req.propertyId

  const key = `stayassistant:subscription:${propertyId}`

  const subRaw = await redis.get(key)

  if (!subRaw) {
    return res.status(400).json({ error: "no subscription" })
  }

  const sub = JSON.parse(subRaw)

  if (!sub.stripeSubscription) {
    return res.status(400).json({ error: "no stripe subscription" })
  }

  try {

    await stripe.subscriptions.update(sub.stripeSubscription, {
      cancel_at_period_end: true
    })

    res.json({ success: true })

  } catch (err) {

    console.error("Cancel error:", err)

    res.status(500).json({ error: "cancel failed" })

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


/* ROUTING */
app.get('/legal/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy.html'));
});

app.get('/legal/cookies', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cookies.html'));
});

app.get('/legal/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/terms.html'));
});


/* --- server port --- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});