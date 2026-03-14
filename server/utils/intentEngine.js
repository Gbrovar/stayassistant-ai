export function detectIntent(text) {

  text = text.toLowerCase()

  const intents = {

    wifi: [
      "wifi",
      "wi-fi",
      "internet",
      "connection",
      "contraseña wifi",
      "internet password"
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
      "check-in",
      "arrival",
      "llegada"
    ],

    checkout: [
      "check out",
      "checkout",
      "departure",
      "salida"
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

  for (const intent in intents) {

    for (const keyword of intents[intent]) {

      if (text.includes(keyword)) {
        return intent
      }

    }

  }

  return "other"
}