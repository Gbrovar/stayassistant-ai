import Preview from "./Preview"
import Branding from "./Branding"
import Personalization from "./Personalization"

export default function Assistant(){

  return(

    <div>

      <h1>Assistant</h1>

      <p>
        Customize the appearance and behavior of your AI concierge.
      </p>

      <section style={{marginTop:"30px"}}>
        <Preview />
      </section>

      <section style={{marginTop:"50px"}}>
        <Branding />
      </section>

      <section style={{marginTop:"50px"}}>
        <Personalization />
      </section>

    </div>

  )

}