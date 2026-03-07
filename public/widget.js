(function () {

    function createButton(config) {

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

        button.onclick = function () {
            window.open("/chat.html", "_blank");
        };

        document.body.appendChild(button);

    }

    window.StayAssistant = {

        init: function (config) {

            if (!config || !config.apartmentId) {
                console.error("StayAssistant: apartmentId is required");
                return;
            }

            console.log("StayAssistant loaded for apartment:", config.apartmentId);

            createButton(config);

        }

    };

})();