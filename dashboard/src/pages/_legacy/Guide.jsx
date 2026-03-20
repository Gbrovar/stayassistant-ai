import FAQEditor from "../FAQEditor"
import Recommendations from "../Recommendations"

export default function Guide(){

  return(

    <div>

      <h1>Guest Guide</h1>

      <p>
        Configure the information your AI concierge uses to help guests.
      </p>

      <section style={{marginTop:"30px"}}>
        <FAQEditor />
      </section>

      <section style={{marginTop:"40px"}}>
        <Recommendations />
      </section>

    </div>

  )

}