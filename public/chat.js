window.onload = function () {

    const messages = document.getElementById("messages");

    messages.innerHTML += `
    <div class="message bot">
    Assistant: Hello 👋 Welcome to Ocean View Apartment.<br>
    I'm your virtual concierge.  
    You can ask me about check-in, wifi, restaurants or local recommendations.
    </div>
    `;

};

async function sendMessage() {

    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    let userText = input.value.trim();

    if (!userText) return;

    // Mostrar mensaje del usuario
    messages.innerHTML += `<div class="message user">You: ${userText}</div>`;

    input.value = "";

    // Mostrar indicador typing
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

        // Eliminar indicador typing
        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        // Mostrar respuesta del asistente
        messages.innerHTML += `<div class="message bot">Assistant: ${data.reply}</div>`;

    } catch (error) {

        const typing = document.getElementById("typing");
        if (typing) typing.remove();

        messages.innerHTML += `<div class="message bot">Assistant: Sorry, something went wrong.</div>`;

    }

    messages.scrollTop = messages.scrollHeight;

}

function quick(text) {
    document.getElementById("input").value = text;
    sendMessage();
}

document.getElementById("input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});