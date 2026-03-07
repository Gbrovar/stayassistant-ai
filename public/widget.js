(function () {

    window.StayAssistant = {

        init: function (config) {

            if (!config || !config.apartmentId) {
                console.error("StayAssistant: apartmentId is required");
                return;
            }

            console.log("StayAssistant loaded for apartment:", config.apartmentId);

        }

    };

})();