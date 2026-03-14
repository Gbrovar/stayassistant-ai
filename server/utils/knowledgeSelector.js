function rankRecommendations(recommendations, intent) {

    if (!recommendations || !recommendations.length) return []

    const keywordMap = {
        restaurants: ["restaurant", "food", "eat", "dinner", "lunch", "pizza", "cafe"]
    }

    const keywords = keywordMap[intent] || []

    return recommendations
        .map(r => {

            const text = `${r.name} ${r.description}`.toLowerCase()

            let score = 0

            keywords.forEach(k => {
                if (text.includes(k)) score++
            })

            return { ...r, score }

        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

}

export function selectKnowledge(property, intent) {

    const k = property.knowledge

    if (!k) return ""

    switch (intent) {

        case "wifi":
            return `
WIFI
Network: ${k.property_info.wifi_name}
Password: ${k.property_info.wifi_password}
`

        case "checkin":
        case "checkout":
            return `
CHECK-IN
${k.property_info.checkin}

CHECK-OUT
${k.property_info.checkout}
`

        case "restaurants":

            const rankedRestaurants = rankRecommendations(
                k.local_recommendations,
                intent
            )

            return `
RESTAURANTS
${rankedRestaurants
                    .map(r => `${r.name} — ${r.description}`)
                    .join("\n")}
`

        case "transport":
            return `
TRANSPORT
${k.property_info.transport}
`

        case "pharmacy":
            return `
EMERGENCY
${k.emergency}
`

        default:
            return `
PROPERTY
${k.property_info.description || ""}

SERVICES
${k.services.slice(0,5).join("\n")}

AMENITIES
${k.amenities.slice(0,5).join("\n")}
`
    }

}