(function () {

    const API_BASE = "https://www.stayassistantai.com"

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



    function createWidget(config) {

        const isPreview = config.preview === true;

        const propertyId = config?.propertyId || "demo_property"; // ✅ FIX

        const mountNode = config.preview
            ? document.getElementById("widget-preview-container")
            : document.body;

        /* botón flotante */

        button = document.createElement("button");
        button.id = "stayassistant-button";

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

        /* pulse animation */

        function pulseButton() {

            button.style.transform = "scale(1.08)";

            setTimeout(() => {

                button.style.transform = "scale(1)";

            }, 200);

        }

        mountNode.appendChild(button);

        let pulseInterval = setInterval(pulseButton, 9000);

        /* --- auto hint after 7 seconds --- */

        setTimeout(() => {

            // si el chat ya está abierto no mostrar hint
            if (iframe && iframe.style.opacity === "1") return;

            const hint = document.createElement("div");

            hint.innerText = "Need help with check-in or local recommendations?";

            hint.style.position = "fixed";
            hint.style.bottom = "85px";
            hint.style.right = "25px";
            hint.style.background = "#111827";
            hint.style.color = "#e5e7eb";
            hint.style.padding = "10px 14px";
            hint.style.borderRadius = "10px";
            hint.style.fontSize = "13px";
            hint.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";
            hint.style.zIndex = "9999";
            hint.style.cursor = "pointer";

            hint.style.opacity = "0";
            hint.style.transform = "translateY(10px)";
            hint.style.transition = "all .25s ease";

            document.body.appendChild(hint);

            /* animación */

            requestAnimationFrame(() => {

                hint.style.opacity = "1";
                hint.style.transform = "translateY(0)";

            });

            /* click abre el chat */

            hint.onclick = () => {

                button.click();
                hint.remove();

            };

            /* desaparecer después de 8 segundos */

            setTimeout(() => {

                hint.style.opacity = "0";

                setTimeout(() => {

                    if (hint) hint.remove();

                }, 300);

            }, 8000);

        }, 7000);

        /* iframe del chat */

        iframe = document.createElement("iframe");
        iframe.id = "stayassistant-iframe";

        const theme = localStorage.getItem("stayassistant_theme") || "default";

        iframe.src = `${API_BASE}/chat.html?embed=true&property=${propertyId}&preview=${config.preview ? "true" : "false"}&theme=${theme}`;

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

        /* estado inicial (animable) */

        iframe.style.opacity = "0";
        iframe.style.transform = "translateY(30px) scale(.96)";
        iframe.style.pointerEvents = "none";
        iframe.style.transition = "opacity .25s ease, transform .25s ease";

        mountNode.appendChild(iframe);

        /* abrir / cerrar chat */

        button.onclick = function () {

            const isMobile = window.innerWidth < 600;

            if (iframe.style.opacity === "0") {

                iframe.style.pointerEvents = "auto";

                requestAnimationFrame(() => {

                    iframe.style.opacity = "1";
                    iframe.style.transform = "translateY(0) scale(1)";

                });

                if (isMobile) {

                    document.body.style.overflow = "hidden";
                    button.style.display = "none";

                }

                clearInterval(pulseInterval);

            } else {

                iframe.style.opacity = "0";
                iframe.style.transform = "translateY(30px) scale(.96)";
                iframe.style.pointerEvents = "none";

                if (isMobile) {

                    document.body.style.overflow = "auto";
                    button.style.display = "block";

                }

            }

        };

        if (config.preview) {

            iframe.style.opacity = "1";
            iframe.style.transform = "translateY(0) scale(1)";
            iframe.style.pointerEvents = "auto";

            // 👇 botón visible pero sin animaciones intrusivas
            button.style.display = "block";

            // 👇 evitar interferir con dashboard scroll
            document.body.style.overflow = "auto";
        }
    }

    window.StayAssistant = {

        init: function (config) {

            if (!config || !config.propertyId) {
                console.error("StayAssistant: apartmentId is required");
                return;
            }

            console.log("StayAssistant loaded for property:", config.propertyId);

            fetch(`${API_BASE}/property/${config.propertyId}`)
                .then(res => res.json())
                .then(data => {

                    if (data.branding) {
                        branding = data.branding;
                    }

                    createWidget(config); // ✅ SOLO UNA VEZ

                })
                .catch(() => {

                    createWidget(config); // fallback

                });

        }

    };

    /* branding default */

    let branding = {

        button_text: "💬 Concierge",
        primary_color: "#22c55e"

    };

    /* cerrar desde iframe */

    window.addEventListener("message", function (event) {

        // 💰 UPGRADE SIGNAL FROM CHAT (invisible)
        if (event.data?.type === "stayassistant_upgrade") {

            console.log("💰 UPGRADE SIGNAL RECEIVED (widget)", event.data.payload)

            try {

                localStorage.setItem(
                    "stayassistant_upgrade_signal",
                    JSON.stringify({
                        ...event.data.payload,
                        timestamp: Date.now()
                    })
                )

            } catch (e) {
                console.warn("Upgrade signal storage failed")
            }

        }

        if (event.data === "stayassistant-close") {

            if (iframe) {

                iframe.style.opacity = "0";
                iframe.style.transform = "translateY(30px) scale(.96)";
                iframe.style.pointerEvents = "none";

            }

            if (button) button.style.display = "block";

            document.body.style.overflow = "auto";

        }

    });


})();