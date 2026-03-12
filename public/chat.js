const conversationId = crypto.randomUUID();

const urlParams = new URLSearchParams(window.location.search);

const propertyId = urlParams.get("property") || "demo_property";

let selectedLanguage = null;


/* INIT */

window.onload = async function () {

    const messages = document.getElementById("messages");

    messages.innerHTML += `
<div class="bot-wrapper">

<div class="bot-avatar">🤖</div>

<div class="bot-message">
Hello 👋 Welcome to Ocean View Apartment.<br><br>
Please choose your language:
</div>

</div>

<div id="languageButtons">

<div class="language-card" onclick="selectLanguage('English')">
<img class="flag" src="https://flagcdn.com/gb.svg">
<div class="language-name">English</div>
</div>

<div class="language-card" onclick="selectLanguage('Español')">
<img class="flag" src="https://flagcdn.com/es.svg">
<div class="language-name">Español</div>
</div>

<div class="language-card" onclick="selectLanguage('Deutsch')">
<img class="flag" src="https://flagcdn.com/de.svg">
<div class="language-name">Deutsch</div>
</div>

</div>
`;

};


/* SELECT LANGUAGE */

function selectLanguage(lang) {

    selectedLanguage = lang;

    const messages = document.getElementById("messages");

    messages.innerHTML += `<div class="message user">You: ${lang}</div>`;

    const buttons = document.getElementById("languageButtons");

    if (buttons) buttons.remove();

    translateUI();

    showQuickActions();

    showProactiveSuggestions();

}


/* TRANSLATE UI */

function translateUI() {

    const input = document.getElementById("input");

    const translations = {

        Español: {
            placeholder: "Escribe tu mensaje..."
        },

        English: {
            placeholder: "Type your message..."
        },

        Deutsch: {
            placeholder: "Nachricht schreiben..."
        }

    };

    if (translations[selectedLanguage]) {

        input.placeholder = translations[selectedLanguage].placeholder;

    }

}


/* QUICK ACTIONS */

async function showQuickActions() {

    const messages = document.getElementById("messages");

    // eliminar quick actions anteriores
    const existing = document.getElementById("quick-actions");
    if (existing) {
        existing.remove();
    }

    let title = "";

    if (selectedLanguage === "Español") title = "¿En qué puedo ayudarte?";
    if (selectedLanguage === "English") title = "How can I help you?";
    if (selectedLanguage === "Deutsch") title = "Wie kann ich helfen?";

    if (!document.querySelector(".help-message")) {

        messages.innerHTML += `
            <div class="bot-wrapper help-message">
            <div class="bot-avatar">🤖</div>
            <div class="bot-message">${title}</div>
            </div>
            `;

    }

    messages.innerHTML += `<div id="quick-actions"></div>`;

    try {

        const response = await fetch(`/property/${propertyId}/suggestions?lang=${selectedLanguage}`);

        const data = await response.json();

        const container = document.getElementById("quick-actions");

        const suggestions = data.suggestions;

        const MAX_VISIBLE = 4;

        let expanded = false;

        function renderSuggestions() {

            container.innerHTML = "";

            const visible = expanded ? suggestions : suggestions.slice(0, MAX_VISIBLE);

            visible.forEach(item => {

                const btn = document.createElement("button");

                btn.innerText = item.label;

                btn.onclick = () => quick(item.value, item.label);

                container.appendChild(btn);

            });

            if (suggestions.length > MAX_VISIBLE) {

                const toggle = document.createElement("button");

                toggle.className = "more-btn";

                if (!expanded) {

                    toggle.innerText =
                        selectedLanguage === "Español" ? "Ver más" :
                            selectedLanguage === "Deutsch" ? "Mehr anzeigen" :
                                "Show more";

                } else {

                    toggle.innerText =
                        selectedLanguage === "Español" ? "Ver menos" :
                            selectedLanguage === "Deutsch" ? "Weniger anzeigen" :
                                "Show less";

                }

                toggle.onclick = () => {

                    expanded = !expanded;

                    renderSuggestions();

                };

                container.appendChild(toggle);

            }

        }

        renderSuggestions();

    } catch (error) {

        console.error("Suggestion load error", error);

    }

}

/* SMART RECOMMENDATIONS */

async function showRecommendations(text) {

    const messages = document.getElementById("messages");

    text = text.toLowerCase();

    let type = null;

    /* --- INTENT DETECTION --- */

    if (
        text.includes("restaurant") ||
        text.includes("restaurants") ||
        text.includes("food") ||
        text.includes("dinner") ||
        text.includes("eat") ||
        text.includes("restaurante") ||
        text.includes("restaurantes")
    ) {

        type = "restaurants";

    } else if (

        text.includes("coffee") ||
        text.includes("breakfast") ||
        text.includes("cafe")

    ) {

        type = "cafes";

    } else if (

        text.includes("bar") ||
        text.includes("drink") ||
        text.includes("nightlife")

    ) {

        type = "bars";

    } else if (

        text.includes("supermarket") ||
        text.includes("grocery") ||
        text.includes("store") ||
        text.includes("shop") ||
        text.includes("market") ||
        text.includes("supermercado") ||
        text.includes("supermercados")

    ) {

        type = "supermarket";

    } else if (

        text.includes("pharmacy")

    ) {

        type = "pharmacy";

    } else if (

        text.includes("park")

    ) {

        type = "parks";

    } else if (

        text.includes("taxi") ||
        text.includes("uber") ||
        text.includes("transport")

    ) {

        type = "transport";

    } else if (

        text.includes("bus") ||
        text.includes("metro") ||
        text.includes("train") ||
        text.includes("public transport")

    ) {

        type = "public_transport";

    } else if (

        text.includes("activity") ||
        text.includes("things to do") ||
        text.includes("activities")

    ) {

        type = "activities";

    }

    if (!type) return;



    try {

        const response = await fetch(`/property/${propertyId}/places/${type}`);

        const data = await response.json();

        console.log("Places result:", data);

        if (!data.items || !data.items.length) return;

        /* --- HEADER (MULTI LANGUAGE) --- */

        let title = "Nearby places you may like:";

        if (selectedLanguage === "Español") {
            title = "Lugares cercanos que podrían interesarte:";
        }

        if (selectedLanguage === "Deutsch") {
            title = "Orte in der Nähe:";
        }

        messages.innerHTML += `

        <div class="bot-wrapper">
            <div class="bot-avatar">📍</div>
            <div class="bot-message">
            <b>${title}</b>
            </div>
        </div>

        `;

        /* --- RENDER PLACES --- */

        data.items.forEach(place => {

            /* --- DISTANCE --- */

            let distance = ""

            if (place.distance !== null && place.distance !== undefined) {

                const meters = Math.round(place.distance)

                if (meters < 1000) {

                    distance = `📍 ${meters} m`

                } else {

                    distance = `📍 ${(meters / 1000).toFixed(1)} km`

                }

            }

            /* --- ETA WALKING --- */

            let etaText = "";

            if (place.distance) {

                const minutes = Math.max(1, Math.round(place.distance / 84));

                etaText = `🚶 ${minutes} min walk<br>`;

            }

            /* --- OPEN / CLOSED STATUS --- */

            let openStatus = "";

            if (place.open === true) {

                openStatus = "🟢 Open";

            } else if (place.open === false) {

                openStatus = "🔴 Closed";

            }

            messages.innerHTML += `

            <div class="bot-wrapper">

                <div class="bot-avatar">📍</div>

                <div class="bot-message">

            <b>${place.name}</b><br>

            ⭐ ${place.rating} ${openStatus}<br>

            ${distanceText}
            ${etaText}

            📍 ${place.address}<br><br>

                    <a 
                    href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}"
                    target="_blank"
                    class="maps-btn"
                    >
                    Open in Google Maps
                    </a>

                </div>

            </div>

            `;

        });

    } catch (error) {

        console.error("Recommendation error", error);

    }

}

/* PROACTIVE SUGGESTIONS */

function showProactiveSuggestions() {

    const messages = document.getElementById("messages");

    let suggestions = [];

    if (selectedLanguage === "Español") {

        suggestions = [

            { label: "🛒 Supermercado cercano", value: "Where is the nearest supermarket?" },

            { label: "🍽 Restaurantes cercanos", value: "Recommend restaurants nearby" },

            { label: "🚕 Pedir un taxi", value: "How can I get a taxi?" },

            { label: "💊 Farmacia cercana", value: "Where is the nearest pharmacy?" }

        ];

    }

    else if (selectedLanguage === "Deutsch") {

        suggestions = [

            { label: "🛒 Supermarkt", value: "Where is the nearest supermarket?" },

            { label: "🍽 Restaurants", value: "Recommend restaurants nearby" },

            { label: "🚕 Taxi bestellen", value: "How can I get a taxi?" },

            { label: "💊 Apotheke", value: "Where is the nearest pharmacy?" }

        ];

    }

    else {

        suggestions = [

            { label: "🛒 Supermarket", value: "Where is the nearest supermarket?" },

            { label: "🍽 Restaurants", value: "Recommend restaurants nearby" },

            { label: "🚕 Taxi", value: "How can I get a taxi?" },

            { label: "💊 Pharmacy", value: "Where is the nearest pharmacy?" }

        ];

    }

    let title = "Welcome 👋<br><br>Since you just arrived, here are some useful places nearby:";

    if (selectedLanguage === "Español") {

        title = "Bienvenido 👋<br><br>Si acabas de llegar, aquí tienes algunos lugares útiles cerca:";

    }

    if (selectedLanguage === "Deutsch") {

        title = "Willkommen 👋<br><br>Hier sind einige nützliche Orte in der Nähe:";

    }

    messages.innerHTML += `

        <div class="bot-wrapper">
        <div class="bot-avatar">🤖</div>
        <div class="bot-message">${title}</div>
        </div>

        <div id="proactive-actions"></div>

        `;

    const container = document.getElementById("proactive-actions");

    suggestions.forEach(item => {

        const btn = document.createElement("button");
        btn.className = "quick-actions";

        btn.innerText = item.label;

        btn.onclick = () => quick(item.value, item.label);

        container.appendChild(btn);

    });

}

/* SEND MESSAGE */

async function sendMessage(forcedText = null, displayLabel = null) {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    const hour = new Date().getHours()

    let userText = forcedText || input.value.trim();

    if (!userText) return;

    const displayText = displayLabel || userText;

    messages.innerHTML += `<div class="message user">You: ${displayText}</div>`;

    input.value = "";

    messages.innerHTML += `
        <div class="bot-wrapper" id="typing">

        <div class="bot-avatar">🤖</div>

        <div class="bot-message">

        <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
        </div>

        </div>

        </div>
        `;

    messages.scrollTop = messages.scrollHeight;

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                message: userText,
                language: selectedLanguage,
                conversationId: conversationId,
                propertyId: propertyId,
                hour: hour

            })

        });

        const data = await response.json();

        const typing = document.getElementById("typing");

        if (typing) typing.remove();

        messages.innerHTML += `
            <div class="bot-wrapper">
            <div class="bot-avatar">🤖</div>
            <div class="bot-message">${data.reply}</div>
            </div>
            `;

        /* primero recomendaciones */

        await showRecommendations(userText);

        /* luego quick actions */

        await showQuickActions();

    } catch (error) {

        const typing = document.getElementById("typing");

        if (typing) typing.remove();

        messages.innerHTML += `
            <div class="bot-wrapper">

            <div class="bot-avatar">🤖</div>

            <div class="bot-message">
            Sorry, something went wrong.
            </div>

            </div>
            `;

    }

    messages.scrollTop = messages.scrollHeight;

}


/* QUICK BUTTON */

function quick(text, label = null) {

    const displayText = label || text;

    sendMessage(text, displayText);

}


/* ENTER KEY */

document.getElementById("input").addEventListener("keypress", function (e) {

    if (e.key === "Enter") {

        sendMessage();

    }

});