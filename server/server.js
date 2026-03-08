import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "redis";
import { properties } from "./properties.js";

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

/* --- static files --- */

app.use(express.static(publicPath));

/* --- health check --- */

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

/* --- Redis client --- */

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", (err) => console.error("Redis error", err));

await redis.connect();

console.log("Redis connected successfully");

/* --- chat endpoint --- */

app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message || "";
    const userLanguage = req.body.language || null;
    const conversationId = req.body.conversationId || "default";
    const propertyId = req.body.propertyId || "default";

    console.log("Property:", propertyId);

    const property = properties[propertyId];

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

          If the guest selected a language, always respond in that language.

          Selected language: ${userLanguage}

          If no language is selected, detect the language used by the guest and answer in that language.

          At the end of your response include the detected language in this format:

          LANGUAGE: English
          or
          LANGUAGE: Español
          or
          LANGUAGE: Deutsch

          Supported languages:
          - English
          - Español
          - Deutsch

          ----------------------------------

          PROPERTY INFORMATION

          Property name: ${property.name}
          Location: ${property.location}

          Type: ${property.type}
          Total units: ${property.units}

          ----------------------------------

          CHECK-IN / CHECK-OUT

          ${property.checkin}

          ${property.checkout}

          ----------------------------------

          WIFI

          Wifi network: ${property.wifi_name}
          Password: ${property.wifi_password}

          ----------------------------------

          PARKING

          ${property.parking}

          ----------------------------------

          TRANSPORT

          ${property.transport}

          ----------------------------------

          RESTAURANTS

          ${property.restaurants.map(r => `${r.name} — ${r.description}`).join("\n")}

          ----------------------------------

          HOUSE RULES

          ${property.rules.join("\n")}

          ----------------------------------

          EMERGENCY

          ${property.emergency}

          ----------------------------------

          Always assist guests politely and clearly.
          `
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

/* --- server port --- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});