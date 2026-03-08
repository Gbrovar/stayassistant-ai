const conversationId = crypto.randomUUID();

const urlParams = new URLSearchParams(window.location.search);

const propertyId = urlParams.get("property") || "demo_property";

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

async function showQuickActions() {

    const messages = document.getElementById("messages");

    let title = "";

    if (selectedLanguage === "Español") {
        title = "¿En qué puedo ayudarte?";
    }

    if (selectedLanguage === "English") {
        title = "How can I help you?";
    }

    if (selectedLanguage === "Deutsch") {
        title = "Wie kann ich helfen?";
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

        <div id="quick-actions"></div>

        `;

    try {

        const response = await fetch(`/property/${propertyId}/suggestions?lang=${selectedLanguage}`);

        const data = await response.json();

        const container = document.getElementById("quick-actions");

        data.suggestions.forEach(item => {

            const btn = document.createElement("button");

            btn.innerText = item.label;

            btn.onclick = () => quick(item.value);

            container.appendChild(btn);

        });

    } catch (error) {

        console.error("Suggestion load error", error);

    }

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

    let userText = forcedText || input.value.trim();

    if (!userText) return;

    messages.innerHTML += `<div class="message user">You: ${userText}</div>`;

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
                conversationId: conversationId,
                propertyId: propertyId
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
    sendMessage(text);
}

/* enter */

document.getElementById("input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});