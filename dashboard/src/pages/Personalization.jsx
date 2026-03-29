import Card from "../components/Card"

export default function Personalization(){

  return(

    <div>

      <Card>

        <p>
          Customize how your concierge interacts with guests.
        </p>

        <div className="branding-field">

          <label>Welcome message</label>

          <input
            placeholder="Hello! I'm your AI concierge. How can I help?"
          />

        </div>

        <div className="branding-field">

          <label>Widget position</label>

          <select>

            <option>Bottom right</option>
            <option>Bottom left</option>

          </select>

        </div>

        <div className="branding-field">

          <label>Default language</label>

          <select>

            <option>Auto detect</option>
            <option>English</option>
            <option>Español</option>
            <option>Deutsch</option>

          </select>

        </div>

        <button className="btn btn-primary">
          Save personalization
        </button>

      </Card>

    </div>

  )

}