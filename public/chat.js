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

    messages.innerHTML += `

<div class="bot-wrapper">

<div class="bot-avatar">🤖</div>

<div class="bot-message">${title}</div>

</div>

<div id="quick-actions"></div>

`;

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
        text.includes("food") ||
        text.includes("dinner") ||
        text.includes("eat") ||
        text.includes("restaurante")
    ) {
        type = "restaurants";
    }

    if (
        text.includes("coffee") ||
        text.includes("breakfast") ||
        text.includes("cafe")
    ) {
        type = "cafes";
    }

    if (
        text.includes("bar") ||
        text.includes("drink") ||
        text.includes("nightlife")
    ) {
        type = "bars";
    }

    if (
        text.includes("supermarket") ||
        text.includes("grocery") ||
        text.includes("store") ||
        text.includes("shop") ||
        text.includes("market")
    ) {
        type = "supermarket";
    }

    if (
        text.includes("pharmacy") ||
        text.includes("pharmacie")
    ) {
        type = "pharmacy";
    }

    if (
        text.includes("park")
    ) {
        type = "parks";
    }

    if (
        text.includes("taxi") ||
        text.includes("uber") ||
        text.includes("transport")
    ) {
        type = "transport";
    }

    if (
        text.includes("bus") ||
        text.includes("metro") ||
        text.includes("train") ||
        text.includes("public transport")
    ) {
        type = "public_transport";
    }

    if (
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

        if (!data.items || !data.items.length) {

            console.log("No places found");

            return;

        }

        /* --- HEADER UX --- */

        messages.innerHTML += `

            <div class="bot-wrapper">

            <div class="bot-avatar">📍</div>

            <div class="bot-message">

            <b>Nearby places you may like:</b>

            </div>

            </div>

            `;

        /* --- RENDER PLACES --- */

        data.items.forEach(place => {

            messages.innerHTML += `

            <div class="bot-wrapper">

            <div class="bot-avatar">📍</div>

            <div class="bot-message">

            <b>${place.name}</b><br>
            ⭐ ${place.rating}<br>
            ${place.open === true ? "🟢 Open now<br>" : ""}
            ${place.address}

            </div>

            </div>

            `;

        });

    } catch (error) {

        console.error("Recommendation error", error);

    }

}


/* SEND MESSAGE */

async function sendMessage(forcedText = null, displayLabel = null) {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

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
                propertyId: propertyId

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

        showRecommendations(userText);

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

    sendMessage(text, label);

}


/* ENTER KEY */

document.getElementById("input").addEventListener("keypress", function (e) {

    if (e.key === "Enter") {

        sendMessage();

    }

});