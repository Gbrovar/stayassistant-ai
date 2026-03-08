export const properties = {

    demo_property: {

        name: "Ocean View Apartments",

        location: "Las Palmas de Gran Canaria",

        type: "Holiday apartment building",

        units: 12,

        checkin: `
            Check-in from 15:00.

            Late check-in:
            Guests arriving after 22:00 can use the self check-in system with a smart lock.
            Instructions are sent automatically on the day of arrival.
            `,

        checkout: `
            Check-out before 11:00.
            `,

        wifi_name: "OceanViewWifi",

        wifi_password: "welcome123",

        parking: `
            Free street parking available nearby.

            Paid parking available at:
            Parking Las Canteras (5 minutes walk).
            `,

                transport: `
            Taxi from airport to the apartment:
            Approximate price: 30–35 €.

            Bus from airport:
            Line 60 to Santa Catalina station.

            Bus stop:
            3 minutes walking from the apartment.
            `,

        restaurants: [

            {
                name: "La Marinera",
                description: "Popular seafood restaurant near Las Canteras beach"
            },

            {
                name: "Mercado del Puerto",
                description: "Local food market with many dining options"
            },

            {
                name: "El Allende",
                description: "Modern tapas and Spanish cuisine"
            }

        ],

        rules: [

            "No smoking inside the apartment",

            "No parties allowed",

            "Quiet hours from 22:00 to 08:00"

        ],

        emergency: `
            Emergency number in Spain: 112

            Nearest hospital:
            Hospital Universitario de Gran Canaria Doctor Negrín
            `,
            
        faq: [

        {
        question: "How do I open the smart lock?",
        answer: "Use the keypad next to the door and enter the access code sent to you on the day of arrival."
        },

        {
        question: "Where can I leave the trash?",
        answer: "Trash containers are located at the end of the street next to the supermarket."
        },

        {
        question: "Can I store luggage after checkout?",
        answer: "Yes, luggage storage may be available until 18:00 depending on availability."
        }

        ],

        services: [

        "Airport transfer service",

        "Bike rental near the beach",

        "Food delivery with Glovo or Uber Eats",

        "Laundry service nearby"

        ],

    }

};