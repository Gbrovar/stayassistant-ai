import Analytics from "./Analytics"
import Conversations from "./Conversations"
import Insights from "./Insights"

export default function AnalyticsDashboard(){

  return(

    <div>

      <h1>Guest Intelligence</h1>

      <p>
        Understand what guests are asking and how your concierge performs.
      </p>

      <section style={{marginTop:"40px"}}>
        <Analytics />
      </section>

      <section style={{marginTop:"50px"}}>
        <Insights />
      </section>

      <section style={{marginTop:"50px"}}>
        <Conversations />
      </section>

    </div>

  )

}