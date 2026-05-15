/* --- DISTANCE HELPER --- */
export function getDistance(lat1, lon1, lat2, lon2) {

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

/* --- TRANSLATE SUGGESTIONS --- */
export function translateSuggestion(text, language) {

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

/* --- BUISLD RESPONSE --- */
export function buildResponse({
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

/* --- DETECT CONTEXT --- */
export function detectContext(hour) {

  if (!hour) return "day"

  if (hour >= 22 || hour <= 5)
    return "night"

  if (hour >= 6 && hour <= 11)
    return "morning"

  if (hour >= 12 && hour <= 18)
    return "afternoon"

  return "evening"

}

/* --- NORMALIZACION DE PREGUNTAS --- */
export function normalizeMessage(message) {

  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\b(what|is|the|please|can|you|tell|me|how|where|when|i|we)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

}

/* --- SIMULARITY --- */
export function similarity(a, b) {

  const aWords = new Set(a.split(" "))
  const bWords = new Set(b.split(" "))

  let match = 0

  for (const word of aWords) {
    if (bWords.has(word)) match++
  }

  return match / Math.min(aWords.size, bWords.size)

}