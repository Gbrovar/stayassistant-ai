export default function Topbar() {

  return (

    <div className="topbar">

      <h3>{localStorage.getItem("propertyId")}</h3>

    
      <div className="property-name">
        Ocean View Apartments
      </div>

    </div>

  )

}
