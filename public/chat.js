const conversationId = crypto.randomUUID();

let selectedLanguage = null;

window.onload = function () {

    const messages = document.getElementById("messages");

    messages.innerHTML += `
<div class="bot-wrapper">

<div class="bot-avatar">
🤖
</div>

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

/* seleccionar idioma */

function selectLanguage(lang) {

    selectedLanguage = lang;

    const messages = document.getElementById("messages");

    messages.innerHTML += `<div class="message user">You: ${lang}</div>`;

    const buttons = document.getElementById("languageButtons");
    if (buttons) buttons.remove();

    translateUI();

    showQuickActions();

    sendMessage(lang);

}

/* traducir UI */

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
/* quick actions */

function showQuickActions() {

    const messages = document.getElementById("messages");

    let title = "";
    let checkin = "";
    let wifi = "";
    let restaurants = "";
    let transport = "";

    if (selectedLanguage === "Español") {
        title = "¿En qué puedo ayudarte?";
        checkin = "Check-in";
        wifi = "Contraseña wifi";
        restaurants = "Restaurantes";
        transport = "Transporte aeropuerto";
    }

    if (selectedLanguage === "English") {
        title = "How can I help you?";
        checkin = "Check-in info";
        wifi = "Wifi password";
        restaurants = "Restaurants";
        transport = "Airport transport";
    }

    if (selectedLanguage === "Deutsch") {
        title = "Wie kann ich helfen?";
        checkin = "Check-in";
        wifi = "WLAN Passwort";
        restaurants = "Restaurants";
        transport = "Flughafentransport";
    }

    messages.innerHTML += `

<div class="bot-wrapper">

<div class="bot-avatar">
🤖
</div>

<div class="bot-message">
${title}
</div>

</div>

<div id="quick-actions">

<button onclick="quick('What time is check-in?')">${checkin}</button>

<button onclick="quick('What is the wifi password?')">${wifi}</button>

<button onclick="quick('Restaurants nearby?')">${restaurants}</button>

<button onclick="quick('How do I get from the airport?')">${transport}</button>

</div>
`;

}

/* recomendaciones dinámicas */

function showRecommendations(text) {

    const messages = document.getElementById("messages");

    text = text.toLowerCase();

    if (text.includes("restaurant") || text.includes("food") || text.includes("dinner") || text.includes("restaurante")) {

        let title = "";

        if (selectedLanguage === "Español") {
            title = "Restaurantes recomendados cerca:";
        }

        if (selectedLanguage === "English") {
            title = "Recommended places nearby:";
        }

        if (selectedLanguage === "Deutsch") {
            title = "Empfohlene Restaurants in der Nähe:";
        }

        messages.innerHTML += `

<div class="bot-wrapper">

<div class="bot-avatar">
🤖
</div>

<div class="bot-message">
${title}
</div>

</div>

<div id="quick-actions">

<button onclick="quick('Tell me about La Marinera restaurant')">La Marinera</button>

<button onclick="quick('Tell me about Mercado del Puerto')">Mercado del Puerto</button>

<button onclick="quick('Tell me about El Allende restaurant')">El Allende</button>

</div>
`;

    }

}

/* enviar mensaje */

async function sendMessage(forcedText = null) {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    let userText = forcedText ? forcedText : input.value.trim();

    if (!userText) return;

    if (!forcedText) {
        messages.innerHTML += `<div class="message user">You: ${userText}</div>`;
    }

    input.value = "";

    messages.innerHTML += `
        <div class="bot-wrapper" id="typing">

        <div class="bot-avatar">
        🤖
        </div>

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
                conversationId: conversationId
            })
        });

        const data = await response.json();

        if (!selectedLanguage && data.language) {

            selectedLanguage = data.language;

            translateUI();

        }

        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        messages.innerHTML += `
<div class="bot-wrapper">

<div class="bot-avatar">
🤖
</div>

<div class="bot-message">
${data.reply}
</div>

</div>
`;

        showRecommendations(userText);

    } catch (error) {

        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        messages.innerHTML += `
<div class="bot-wrapper">

<div class="bot-avatar">
🤖
</div>

<div class="bot-message">
Sorry, something went wrong.
</div>

</div>
`;

    }

    messages.scrollTop = messages.scrollHeight;

}

/* quick */

function quick(text) {
    document.getElementById("input").value = text;
    sendMessage();
}

/* enter */

document.getElementById("input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});