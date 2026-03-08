(function () {

    let iframe = null;

    function createWidget(config) {

        /* botón flotante */

        const button = document.createElement("button");

        button.innerText = "💬 Concierge";

        button.style.position = "fixed";
        button.style.bottom = "25px";
        button.style.right = "25px";
        button.style.background = "linear-gradient(135deg,#22c55e,#16a34a)";
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "14px 22px";
        button.style.borderRadius = "30px";
        button.style.cursor = "pointer";
        button.style.fontSize = "15px";
        button.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";
        button.style.zIndex = "9999";

        document.body.appendChild(button);

        /* iframe del chat */

        iframe = document.createElement("iframe");

        iframe.src = `/chat.html?embed=true&property=${config.propertyId}`;

        iframe.style.position = "fixed";
        iframe.style.bottom = "90px";
        iframe.style.right = "25px";
        iframe.style.width = "380px";
        iframe.style.height = "560px";
        iframe.style.border = "none";
        iframe.style.borderRadius = "14px";
        iframe.style.boxShadow = "0 20px 40px rgba(0,0,0,0.45)";
        iframe.style.zIndex = "9998";
        iframe.style.display = "none";

        document.body.appendChild(iframe);

        /* abrir/cerrar chat */

        button.onclick = function () {

            if (iframe.style.display === "none") {

                iframe.style.display = "block";

            } else {

                iframe.style.display = "none";

            }

        };

    }

    window.StayAssistant = {

        init: function (config) {

            if (!config || !config.propertyId) {

                console.error("StayAssistant: apartmentId is required");

                return;

            }

            console.log("StayAssistant loaded for property:", config.propertyId);

            createWidget(config);

        }

    };

})();