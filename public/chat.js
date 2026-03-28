let LIMIT_REACHED = false

const API_BASE = window.location.origin

const conversationId = crypto.randomUUID();

/* DEMO VISITOR ID */

function getVisitorId() {

    let visitorId = localStorage.getItem("stayassistant_visitor")

    if (!visitorId) {

        visitorId = crypto.randomUUID()

        localStorage.setItem("stayassistant_visitor", visitorId)

    }

    return visitorId

}

const visitorId = getVisitorId()

const urlParams = new URLSearchParams(window.location.search);

const propertyId = urlParams.get("property") || "demo_property";

let propertyName = "StayAssistant";

let selectedLanguage = detectBrowserLanguage();

function detectBrowserLanguage() {

    const lang = navigator.language || navigator.userLanguage;

    if (!lang) return "English";

    if (lang.startsWith("es")) return "Español";

    if (lang.startsWith("de")) return "Deutsch";

    return "English";

}

const savedLang = localStorage.getItem("stayassistant_lang");

function renderPlacesFromBackend(places) {

    const messages = document.getElementById("messages");

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
            <div class="bot-message"><b>${title}</b></div>
        </div>
    `;

    places.forEach(place => {

        let distanceText = "";

        if (place.distance) {
            distanceText = place.distance > 1000
                ? `📍 ${(place.distance / 1000).toFixed(1)} km<br>`
                : `📍 ${place.distance} m<br>`;
        }

        let etaText = "";
        if (place.distance) {
            const minutes = Math.max(1, Math.round(place.distance / 84));
            etaText = `🚶 ${minutes} min<br>`;
        }

        let openStatus = "";
        if (place.open === true) openStatus = "🟢 Open";
        if (place.open === false) openStatus = "🔴 Closed";

        messages.innerHTML += `
            <div class="bot-wrapper">
                <div class="bot-avatar">📍</div>
                <div class="bot-message">
                    <b>${place.name}</b><br>
                    ⭐ ${place.rating} ${openStatus}<br>
                    ${distanceText}
                    ${etaText}
                    📍 ${place.address}<br><br>

                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}"
                       target="_blank"
                       class="maps-btn">
                       Open in Google Maps
                    </a>
                </div>
            </div>
        `;
    });

    messages.scrollTop = messages.scrollHeight;
}

function getLimitMessage() {

    if (selectedLanguage === "Español") {
        return "Lo siento, ahora mismo no puedo ayudarte con eso 🙏. Por favor, contacta con recepción para asistencia inmediata.";
    }

    if (selectedLanguage === "Deutsch") {
        return "Es tut mir leid, ich kann dir gerade nicht weiterhelfen 🙏. Bitte wende dich an die Rezeption für Unterstützung.";
    }

    return "I'm sorry, I can't assist with that right now 🙏. Please contact reception for immediate assistance.";
}

/* --- CHAT TOKEN INIT --- */

async function initChatToken() {

    let token = localStorage.getItem("stayassistant_chat_token");

    if (token) return token;

    try {

        const res = await fetch(`${API_BASE}/chat/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                propertyId,
                visitorId
            })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem("stayassistant_chat_token", data.token);
            return data.token;
        }

    } catch (e) {
        console.error("Token init failed", e);
    }

    return null;
}

if (savedLang) {
    selectedLanguage = savedLang;
} else {
    localStorage.setItem("stayassistant_lang", selectedLanguage);
}


/* INIT */

window.onload = async function () {

    // 🔐 INIT TOKEN 
    await initChatToken();

    try {

        const res = await fetch(`${API_BASE}/property/${propertyId}`);
        const data = await res.json();

        if (data && data.name) {
            propertyName = data.name;
        }

        const header = document.getElementById("chat-property-name")

        if (header) {
            header.innerText = propertyName
        }

    } catch (e) {
        console.log("Property load failed");
    }

    const messages = document.getElementById("messages");

    let welcomeText = "Hello 👋 Welcome to " + propertyName

    if (selectedLanguage === "Español")
        welcomeText = "Hola 👋 Bienvenido a " + propertyName

    if (selectedLanguage === "Deutsch")
        welcomeText = "Hallo 👋 Willkommen bei " + propertyName

    messages.innerHTML += `
        <div class="bot-wrapper">

        <div class="bot-avatar">🤖</div>

        <div class="bot-message">
        ${welcomeText}
        </div>

        </div>
        `;

    translateUI();
    showQuickActions();
    showProactiveSuggestions();

};


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

        let langParam = "English"

        if (selectedLanguage === "Español") langParam = "Español"
        if (selectedLanguage === "Deutsch") langParam = "Deutsch"

        const response = await fetch(
            `${API_BASE}/property/${propertyId}/suggestions?lang=${encodeURIComponent(langParam)}`
        );

        const data = await response.json();

        const container = document.getElementById("quick-actions");

        let suggestions = data.suggestions || [];

        /* fallback translation if backend fails */

        if (selectedLanguage === "Español") {

            suggestions = suggestions.map(s => {

                if (s.label === "How do I check in?")
                    return { label: "¿Cómo hago el check-in?", value: s.value };

                if (s.label === "Is there Wi-Fi available?")
                    return { label: "¿Hay Wi-Fi disponible?", value: s.value };

                if (s.label === "Airport transfer service")
                    return { label: "Servicio de traslado al aeropuerto", value: s.value };

                if (s.label === "Bike rental near the beach")
                    return { label: "Alquiler de bicicletas cerca de la playa", value: s.value };

                return s;

            });

        }

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
        text.includes("supermercados") ||
        text.includes("mercado")

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

        const response = await fetch(`${API_BASE}/property/${propertyId}/places/${type}`);

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

        let labels = {

            open: "Open",
            closed: "Closed",
            maps: "Open in Google Maps",
            walk: "min walk"

        }

        if (selectedLanguage === "Español") {

            labels = {

                open: "Abierto",
                closed: "Cerrado",
                maps: "Abrir en Google Maps",
                walk: "min caminando"

            }

        }

        if (selectedLanguage === "Deutsch") {

            labels = {

                open: "Geöffnet",
                closed: "Geschlossen",
                maps: "In Google Maps öffnen",
                walk: "Min zu Fuß"

            }

        }

        /* --- RENDER PLACES --- */

        data.items.forEach(place => {

            /* --- DISTANCE --- */

            let distanceText = "";

            if (place.distance) {

                if (place.distance > 1000) {

                    distanceText = `📍 ${(place.distance / 1000).toFixed(1)} km<br>`;

                } else {

                    distanceText = `📍 ${place.distance} m<br>`;

                }

            }

            /* --- ETA WALKING --- */

            let etaText = "";

            if (place.distance !== null && place.distance !== undefined) {

                const minutes = Math.max(1, Math.round(place.distance / 84));

                let walkLabel = "min walk";

                if (selectedLanguage === "Español") walkLabel = "min caminando";
                if (selectedLanguage === "Deutsch") walkLabel = "Min zu Fuß";

                etaText = `🚶 ${minutes} ${walkLabel}<br>`;

            }

            /* --- OPEN / CLOSED STATUS --- */

            let openStatus = "";

            if (place.open === true) {

                openStatus = `🟢 ${labels.open}`;

            } else if (place.open === false) {

                openStatus = `🔴 ${labels.closed}`;

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
                    ${labels.maps}
                    </a>

                </div>

            </div>

            `;

        });

    } catch (error) {

        console.error("Recommendation error", error);

    }

    messages.scrollTop = messages.scrollHeight;

}

/* PROACTIVE SUGGESTIONS */
const hour = new Date().getHours()

let context = "day"

if (hour >= 22 || hour <= 5) context = "night"
if (hour >= 6 && hour <= 11) context = "morning"
if (hour >= 12 && hour <= 18) context = "afternoon"

function showProactiveSuggestions() {

    const messages = document.getElementById("messages");

    let suggestions = [];

    if (selectedLanguage === "Español") {

        if (context === "night") {

            suggestions = [

                { label: "🍽 Restaurantes abiertos", value: "Restaurants open now" },

                { label: "🍸 Bares cercanos", value: "Nearby bars" },

                { label: "🚕 Pedir taxi", value: "Call a taxi" }

            ];

        } else {

            suggestions = [

                { label: "🛒 Supermercado cercano", value: "Where is the nearest supermarket?" },

                { label: "🍽 Restaurantes cercanos", value: "Recommend restaurants nearby" },

                { label: "🚕 Pedir un taxi", value: "How can I get a taxi?" },

                { label: "💊 Farmacia cercana", value: "Where is the nearest pharmacy?" }

            ];

        }

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

function getPreResponse() {

    if (selectedLanguage === "Español") {
        return "Déjame comprobar eso para ti...";
    }

    if (selectedLanguage === "Deutsch") {
        return "Einen Moment, ich prüfe das für dich...";
    }

    return "Let me check that for you...";

}

function sendUpgradeSignalToParent(upgrade) {

    if (window.parent !== window) {

        window.parent.postMessage({
            type: "stayassistant_upgrade",
            payload: upgrade
        }, "*")

    }

}

/* SEND MESSAGE */

async function sendMessage(forcedText = null, displayLabel = null) {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    const hour = new Date().getHours()

    let userText = forcedText || input.value.trim();

    if (!userText) return;

    const displayText = displayLabel || userText;

    let youText = "You"

    if (selectedLanguage === "Español") youText = "Tú"
    if (selectedLanguage === "Deutsch") youText = "Du"

    messages.innerHTML += `<div class="message user">${youText}: ${displayText}</div>`;

    /* PRE RESPONSE (LATENCY OPTIMIZATION) */

    let shouldShowPreResponse = true;

    if (shouldShowPreResponse) {
        messages.innerHTML += `
        <div class="bot-wrapper pre-response">
            <div class="bot-avatar">🤖</div>
            <div class="bot-message">
            ${getPreResponse()}
            </div>
        </div>
    `;
    }

    input.value = "";

    if (shouldShowPreResponse) {
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
    }

    messages.scrollTop = messages.scrollHeight;

    try {

        if (LIMIT_REACHED) {

            messages.innerHTML += `
                    <div class="bot-wrapper">
                        <div class="bot-avatar">🤖</div>
                        <div class="bot-message">
                            ${getLimitMessage()}
                        </div>
                    </div>
                `
        }

        const chatToken = localStorage.getItem("stayassistant_chat_token");
        const response = await fetch(`${API_BASE}/chat`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-chat-token": chatToken || ""
            },

            body: JSON.stringify({

                message: userText,
                language: selectedLanguage || "English",
                conversationId: conversationId,
                propertyId: propertyId,
                hour: hour,
                visitorId: visitorId,

                guestContext: {
                    arrival: localStorage.getItem("stayassistant_arrival"),
                    departure: localStorage.getItem("stayassistant_departure")
                }

            })

        });

        const data = await response.json();

        // 💰 UPGRADE SIGNAL (invisible para huésped)
        if (data.upgrade) {

            console.log("💰 UPGRADE TRIGGER:", data.upgrade)

            // guardar para dashboard
            localStorage.setItem(
                "stayassistant_upgrade_signal",
                JSON.stringify({
                    ...data.upgrade,
                    timestamp: Date.now()
                })
            )

            // enviar al widget (cross iframe)
            sendUpgradeSignalToParent(data.upgrade)

        }

        if (data.limit_reached) {
            LIMIT_REACHED = true;

            messages.innerHTML += `
                <div class="bot-wrapper">
                    <div class="bot-avatar">🤖</div>
                    <div class="bot-message">
                        If you need more help, you can contact the property directly 😊
                    </div>
                </div>
            `;
        }

        const typing = document.getElementById("typing");

        if (typing) typing.remove();

        if (data.places && data.places.length) {

            renderPlacesFromBackend(data.places)

        } else {

            messages.innerHTML += `
                <div class="bot-wrapper">
                <div class="bot-avatar">🤖</div>
                <div class="bot-message">${data.reply}</div>
                </div>
            `;

        }

        /* primero recomendaciones */

        if (data.reply && !data.reply.includes("something went wrong")) {
            const detectedIntent = data.intent || null;
            //await showRecommendations(detectedIntent || userText)
        }

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


/* CLOSE CHAT (X) */
const closeBtn = document.getElementById("close-chat");

if (closeBtn) {

    closeBtn.onclick = function () {

        // si está dentro de iframe
        if (window.parent !== window) {

            window.parent.postMessage("stayassistant-close", "*");

        }

        // si está abierto directamente
        else {

            const widget = document.getElementById("chat-widget");

            if (widget) {
                widget.classList.remove("open");
            }

        }

    }

}