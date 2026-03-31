export function selectKnowledge(property, intent, memory = {}) {

    const k = property.knowledge || {}

    const preferences = memory.preferences?.join(", ") || null
    const budget = memory.budget || null
    const travel = memory.travelContext || null

    function buildUserContext() {
        let ctx = ""

        if (preferences) ctx += `Guest preferences: ${preferences}\n`
        if (budget) ctx += `Budget level: ${budget}\n`
        if (travel) ctx += `Travel type: ${travel}\n`

        return ctx
    }

    switch (intent) {

        case "wifi":
            return `
WIFI INFORMATION:
Network: ${k.property_info?.wifi_name || "Not provided"}
Password: ${k.property_info?.wifi_password || "Not provided"}

${buildUserContext()}
`

        case "checkin":
        case "checkout":
            return `
CHECK-IN / CHECK-OUT:
Check-in: ${k.property_info?.checkin || "Not specified"}
Check-out: ${k.property_info?.checkout || "Not specified"}
Instructions: ${k.property_info?.checkin_instructions || "Not provided"}

${buildUserContext()}
`

        case "location":
        case "address":
            return `
PROPERTY LOCATION:

Address:
${property.address || "Not provided"}
${property.postal_code || ""}
${property.city || ""}
${property.country || ""}

INSTRUCTIONS:
- If user asks for address → give it clearly
- Keep answer short and direct
`

        case "restaurants":

            const recs = (k.local_recommendations || []).slice(0, 5)

            return `
LOCAL RESTAURANT CONTEXT:

${recs.map(r => `- ${r}`).join("\n") || "No curated recommendations available"}

INSTRUCTIONS:
- Recommend places based on guest preferences
- Be specific when possible
- Keep it natural and concierge-style

${buildUserContext()}
`

        case "activities":

            const activities = (k.local_recommendations || []).slice(0, 5)

            return `
LOCAL ACTIVITIES:

${activities.map(a => `- ${a}`).join("\n") || "No activities configured"}

INSTRUCTIONS:
- Suggest relevant activities based on guest type
- Keep suggestions concise

${buildUserContext()}
`

        case "transport":
            return `
TRANSPORT CONTEXT:

${k.property_info?.transport || "No transport information provided"}

INSTRUCTIONS:
- Do NOT assume available transport types
- If transport info is missing → ask user destination
- Suggest taxis or generic options ONLY if safe

${buildUserContext()}
`

        default:
            return `
            PROPERTY CONTEXT:

            Amenities:
            ${(property.amenities || []).join(", ") || "None provided"}

            Services:
            ${(property.services || []).map(s => `- ${s}`).join("\n") || "None provided"}

            House rules:
            ${k.property_info?.house_rules || "Not provided"}

            IMPORTANT:
            - These are REAL data configured by the property
            - If guest asks about facilities → use amenities
            - If guest asks about what is offered → use services
            - NEVER say something is unavailable if it is listed here

            ${buildUserContext()}
            `
    }

}