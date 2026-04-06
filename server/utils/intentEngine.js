export function detectIntent(text) {

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  text = normalize(text)

  const intents = {

    wifi: [
      "wifi",
      "wi fi",
      "internet",
      "connection",
      "password",
      "wifi password",
      "internet password",
      "clave wifi",
      "contraseña",
      "passwort",
      "wlan"
    ],

    restaurants: [
      "restaurant",
      "food",
      "eat",
      "dinner",
      "lunch",
      "breakfast",
      "comer",
      "restaurante",
      "cena",
      "sushi",
      "pizza",
      "burger"
    ],

    supermarket: [
      "supermarket",
      "grocery",
      "market",
      "supermercado"
    ],

    waste: [
      "basura",
      "tirar basura",
      "donde tirar basura",
      "donde puedo tirar la basura",
      "tirar la basura",
      "basura donde",
      "trash",
      "garbage",
      "waste",
      "bin",
      "rubbish",
      "leave trash"
    ],

    taxi: [
      "taxi",
      "uber",
      "cab",
      "ride"
    ],

    checkin: [
      "check in",
      "checkin",
      "check-in",
      "arrival",
      "arrive",
      "when can i arrive",
      "llegada",
      "hora llegada",
      "ankunft"
    ],

    checkout: [
      "check out",
      "checkout",
      "check-out",
      "departure",
      "leave",
      "salida",
      "hora salida",
      "abreise"
    ],

    address: [
      "address",
      "direccion",
      "dirección",
      "where is",
      "location",
      "ubicacion",
      "ubicación",
      "donde esta",
      "dónde está"
    ],

    pharmacy: [
      "pharmacy",
      "farmacia",
      "medicine",
      "medicines"
    ],

    transport: [
      "bus",
      "metro",
      "train",
      "transport",
      "transporte",
      "airport"
    ],

    activities: [
      "activity",
      "things to do",
      "tour",
      "excursion",
      "visit",
      "que hacer",
      "was tun"
    ]

  }

  const scores = {}

  // init scores
  Object.keys(intents).forEach(intent => {
    scores[intent] = 0
  })

  if (text.includes("basura")) return "waste"

  // 🔥 SCORING POR KEYWORDS (tu sistema mejorado)
  for (const intent in intents) {
    for (const keyword of intents[intent]) {
      if (text.includes(keyword)) {
        scores[intent] += keyword.split(" ").length > 1 ? 2 : 1
      }
    }
  }

  // 🔥 CONTEXTO INTELIGENTE

  if (text.includes("things to do") || text.includes("what can we do")) {
    scores.activities += 3
  }

  if (text.includes("where can i eat") || text.includes("places to eat")) {
    scores.restaurants += 3
  }

  if (text.includes("with kids") || text.includes("family")) {
    scores.activities += 2
  }

  if (text.includes("cheap") || text.includes("budget")) {
    scores.restaurants += 1
  }

  if (text.includes("how do i get") || text.includes("how to go")) {
    scores.transport += 2
  }

  // 🔥 PRIORIDAD (como tu sistema original)
  const priorityOrder = [
    "waste",
    "checkin",
    "checkout",
    "address",
    "wifi",
    "taxi",
    "transport",
    "restaurants",
    "supermarket",
    "pharmacy",
    "activities"
  ]

  let bestIntent = "other"
  let bestScore = 0

  for (const intent of priorityOrder) {
    if (scores[intent] > bestScore) {
      bestScore = scores[intent]
      bestIntent = intent
    }
  }

  // 🔥 FALLBACK INTELIGENTE
  if (bestScore === 0) {

    if (text.length < 20) return "other"

    if (text.includes("recommend") || text.includes("suggest")) {
      return "restaurants"
    }

    if (text.includes("help")) {
      return "other"
    }
  }

  return bestIntent
}