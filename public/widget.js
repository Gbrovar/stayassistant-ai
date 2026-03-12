(function () {

    if (window.StayAssistantWidgetLoaded) {
        return;
    }

    window.StayAssistantWidgetLoaded = true;

    let iframe = null;
    let button = null;

    /* --- detectar script --- */

    let script = document.currentScript;

    if (!script) {

        const scripts = document.getElementsByTagName("script");

        script = scripts[scripts.length - 1];

    }

    /* --- leer parámetros del script --- */

    let propertyId = "demo_property";

    try {

        const url = new URL(script.src);

        const params = new URLSearchParams(url.search);

        propertyId = params.get("property") || "demo_property";

    } catch (e) {

        console.warn("StayAssistant: could not parse script URL");

    }

    console.log("StayAssistant widget loaded for property:", propertyId);

    function createWidget(config) {

        /* botón flotante */

        button = document.createElement("button");


        button.innerText = branding.button_text || "💬 Concierge";

        button.style.position = "fixed";
        button.style.bottom = "25px";
        button.style.right = "25px";
        button.style.background = branding.primary_color;
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "14px 22px";
        button.style.borderRadius = "30px";
        button.style.cursor = "pointer";
        button.style.fontSize = "15px";
        button.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";
        button.style.zIndex = "9999";
        button.style.transition = "transform 0.2s ease";

        /* --- pulse animation --- */

        function pulseButton() {

            button.style.transform = "scale(1.08)";

            setTimeout(() => {

                button.style.transform = "scale(1)";

            }, 200);

        }

        document.body.appendChild(button);

        let pulseInterval = setInterval(pulseButton, 9000);

        /* iframe del chat */

        iframe = document.createElement("iframe");

        iframe.src = `/chat.html?embed=true&property=${propertyId}`;

        const isMobile = window.innerWidth < 600;

        iframe.style.position = "fixed";
        iframe.style.border = "none";
        iframe.style.zIndex = "9998";

        if (isMobile) {

            iframe.style.bottom = "0";
            iframe.style.right = "0";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.borderRadius = "0";

        } else {

            iframe.style.bottom = "90px";
            iframe.style.right = "25px";
            iframe.style.width = "380px";
            iframe.style.height = "560px";
            iframe.style.borderRadius = "14px";

        }

        iframe.style.boxShadow = "0 20px 40px rgba(0,0,0,0.45)";
        iframe.style.opacity = "0";
        iframe.style.transform = "translateY(20px) scale(.95)";
        iframe.style.pointerEvents = "none";
        iframe.style.transition = "opacity .25s ease, transform .25s ease";

        document.body.appendChild(iframe);

        /* abrir/cerrar chat */

        button.onclick = function () {

            const isMobile = window.innerWidth < 600;

            if (iframe.style.display === "none") {

                iframe.style.display = "block";

                if (isMobile) {
                    document.body.style.overflow = "hidden";
                    button.style.display = "none";
                }

                clearInterval(pulseInterval);

            } else {

                iframe.style.display = "none";

                if (isMobile) {
                    document.body.style.overflow = "auto";
                    button.style.display = "block";
                }

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

    /* --- auto init widget --- */

    let branding = {
        button_text: "💬 Concierge",
        primary_color: "#22c55e"
    };

    window.addEventListener("message", function (event) {

        if (event.data === "stayassistant-close") {

            if (iframe) iframe.style.display = "none";

            if (button) button.style.display = "block";

            document.body.style.overflow = "auto";

        }

    });

    fetch(`/property/${propertyId}`)
        .then(res => res.json())
        .then(data => {

            if (data.branding) {
                branding = data.branding;
            }

            createWidget();

        })
        .catch(() => {

            createWidget();

        });




})();