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

Description:
${k.property_info?.description || "Not provided"}

Amenities:
${(k.amenities || []).slice(0, 5).join(", ")}

SERVICES AVAILABLE AT THE PROPERTY:
${(k.services || []).map(s => `- ${s}`).join("\n") || "None provided"}

IMPORTANT:
- These services are CONFIRMED available at the property
- You can confidently use them in responses

INSTRUCTIONS:
- Use this info ONLY if relevant
- Do not hallucinate missing details

${buildUserContext()}
`
    }

}