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
      "cena"
    ],

    supermarket: [
      "supermarket",
      "grocery",
      "market",
      "supermercado"
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
      "transporte"
    ],

    activities: [
      "activity",
      "things to do",
      "tour",
      "excursion"
    ]

  }

  const priorityOrder = [
    "checkin",
    "checkout",
    "wifi",
    "taxi",
    "transport",
    "restaurants",
    "supermarket",
    "pharmacy",
    "activities"
  ]

  for (const intent of priorityOrder) {
    for (const keyword of intents[intent] || []) {
      if (text.includes(keyword)) {
        return intent
      }
    }
  }
  
  return "other"
}