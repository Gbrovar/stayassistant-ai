export default function StatItem({label,value}){

  return(

    <div className="stat-item">

      <span>{label}</span>

      <b>{value}</b>

    </div>

  )

}