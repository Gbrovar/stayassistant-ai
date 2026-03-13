import {useEffect,useState} from "react"
import Card from "../components/Card"
import StatItem from "../components/StatItem"

export default function Analytics(){

  const [stats,setStats] = useState([])

  const propertyId = "demo_property"

  useEffect(()=>{

    async function load(){

      const res = await fetch(`/analytics/${propertyId}`)

      const data = await res.json()

      setStats(data.top_questions)

    }

    load()

  },[])

  return(

    <div>

      <h1>Analytics</h1>

      <Card>

        {stats.map(item=>(
          <StatItem
            key={item.question}
            label={item.question}
            value={item.count}
          />
        ))}

      </Card>

    </div>

  )

}