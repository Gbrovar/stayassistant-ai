window.onload=function(){

const messages=document.getElementById("messages");

messages.innerHTML+=`
<div class="message bot">
Assistant: Hello 👋 Welcome to Ocean View Apartment.<br><br>
Please choose your language:
</div>

<div id="languageButtons">

<div class="language-card" onclick="selectLanguage('English')">
<div class="language-flag">🇬🇧</div>
<div class="language-name">English</div>
</div>

<div class="language-card" onclick="selectLanguage('Español')">
<div class="language-flag">🇪🇸</div>
<div class="language-name">Español</div>
</div>

<div class="language-card" onclick="selectLanguage('Deutsch')">
<div class="language-flag">🇩🇪</div>
<div class="language-name">Deutsch</div>
</div>

</div>
`;

};

/* seleccionar idioma */

function selectLanguage(lang){

const messages=document.getElementById("messages");

messages.innerHTML+=`<div class="message user">You: ${lang}</div>`;

const buttons=document.getElementById("languageButtons");
if(buttons) buttons.remove();

showQuickActions();

sendMessage(lang);

}

/* quick actions */

function showQuickActions(){

const messages=document.getElementById("messages");

messages.innerHTML+=`

<div class="message bot">
How can I help you?
</div>

<div id="quick-actions">

<button onclick="quick('What time is check-in?')">Check-in info</button>

<button onclick="quick('What is the wifi password?')">Wifi password</button>

<button onclick="quick('Restaurants nearby?')">Restaurants</button>

<button onclick="quick('How do I get from the airport?')">Airport transport</button>

</div>
`;

}

/* detectar recomendaciones */

function showRecommendations(text){

const messages=document.getElementById("messages");

text=text.toLowerCase();

if(text.includes("restaurant") || text.includes("food") || text.includes("dinner")){

messages.innerHTML+=`

<div class="message bot">
Recommended places nearby:
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

async function sendMessage(forcedText=null){

const input=document.getElementById("input");
const messages=document.getElementById("messages");

let userText=forcedText?forcedText:input.value.trim();

if(!userText) return;

if(!forcedText){
messages.innerHTML+=`<div class="message user">You: ${userText}</div>`;
}

input.value="";

messages.innerHTML+=`<div class="message bot" id="typing">Assistant is typing...</div>`;
messages.scrollTop=messages.scrollHeight;

try{

const response=await fetch("/chat",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:userText
})
});

const data=await response.json();

const typing=document.getElementById("typing");
if(typing) typing.remove();

messages.innerHTML+=`<div class="message bot">Assistant: ${data.reply}</div>`;

/* recomendaciones dinámicas */

showRecommendations(userText);

}catch(error){

const typing=document.getElementById("typing");
if(typing) typing.remove();

messages.innerHTML+=`<div class="message bot">Assistant: Sorry, something went wrong.</div>`;

}

messages.scrollTop=messages.scrollHeight;

}

/* quick */

function quick(text){
document.getElementById("input").value=text;
sendMessage();
}

/* enter */

document.getElementById("input").addEventListener("keypress",function(e){
if(e.key==="Enter"){
sendMessage();
}
});