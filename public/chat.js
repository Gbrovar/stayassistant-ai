window.onload = function () {

    const messages = document.getElementById("messages");

    messages.innerHTML += `
    <div class="message bot">
    Assistant: Hello 👋 Welcome to Ocean View Apartment.<br><br>
    Please choose your language:
    </div>

    <div class="message bot" id="languageButtons">
        <button onclick="selectLanguage('English')">🇬🇧 EN</button>
<button onclick="selectLanguage('Español')">🇪🇸 ES</button>
<button onclick="selectLanguage('Deutsch')">🇩🇪 DE</button>
    </div>
    `;

};

/* -------- seleccionar idioma -------- */

function selectLanguage(lang) {

    const messages = document.getElementById("messages");

    // Mostrar selección del usuario
    messages.innerHTML += `<div class="message user">You: ${lang}</div>`;

    // eliminar botones
    const buttons = document.getElementById("languageButtons");
    if (buttons) buttons.remove();

    // enviar idioma al servidor
    sendMessage(lang);

}

/* -------- enviar mensaje -------- */

async function sendMessage(forcedText = null) {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    let userText = forcedText ? forcedText : input.value.trim();

    if (!userText) return;

    if (!forcedText) {
        messages.innerHTML += `<div class="message user">You: ${userText}</div>`;
    }

    input.value = "";

    // indicador typing
    messages.innerHTML += `<div class="message bot" id="typing">Assistant is typing...</div>`;
    messages.scrollTop = messages.scrollHeight;

    try {

        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userText
            })
        });

        const data = await response.json();

        // eliminar typing
        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        // respuesta del asistente
        messages.innerHTML += `<div class="message bot">Assistant: ${data.reply}</div>`;

    } catch (error) {

        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        messages.innerHTML += `<div class="message bot">Assistant: Sorry, something went wrong.</div>`;

    }

    messages.scrollTop = messages.scrollHeight;

}

/* -------- quick buttons -------- */

function quick(text) {
    document.getElementById("input").value = text;
    sendMessage();
}

/* -------- enter para enviar -------- */

document.getElementById("input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});