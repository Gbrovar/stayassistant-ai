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
            return `
RESTAURANTS
${k.local_recommendations
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
SERVICES
${k.services.join("\n")}

AMENITIES
${k.amenities.join("\n")}
`
    }

}