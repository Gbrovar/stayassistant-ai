import Card from "../components/Card"

export default function Personalization(){

  return(

    <div style={{ maxWidth: 500 }}>


        <p>
          Customize how your concierge interacts with guests.
        </p>

        <div className="branding-field">

          <label>Welcome message</label>

          <input
            placeholder="Hello! I'm your AI concierge. How can I help?"
          />

        </div>

        <div className="branding-field" style={{ marginBottom: 14 }}>

          <label>Widget position</label>

          <select className="input">

            <option>Bottom right</option>
            <option>Bottom left</option>

          </select>

        </div>

        <div className="branding-field" style={{ marginBottom: 14 }}>

          <label>Default language</label>

          <select className="input">

            <option>Auto detect</option>
            <option>English</option>
            <option>Español</option>
            <option>Deutsch</option>

          </select>

        </div>

        <button className="btn btn-primary">
          Save personalization
        </button>


    </div>

  )

}