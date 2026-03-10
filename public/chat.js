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

    // eliminar quick actions anteriores
    const existing = document.getElementById("quick-actions");
    if (existing) {
        existing.parentElement.remove();
    }

    const messages = document.getElementById("messages");

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

        data.suggestions.forEach(item => {

            const btn = document.createElement("button");

            btn.innerText = item.label;

            btn.onclick = () => quick(item.value, item.label);

            container.appendChild(btn);

        });

    } catch (error) {

        console.error("Suggestion load error", error);

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