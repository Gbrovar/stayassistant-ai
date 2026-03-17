export default function Topbar() {

  const propertyName = localStorage.getItem("propertyName") || "My Property"

  return (

    <div className="topbar">

      <div className="topbar-left">
        <h3 className="topbar-title">{propertyName}</h3>
      </div>

      <div className="topbar-right">

        <div className="plan-badge">
          Free Plan
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => {
            localStorage.clear()
            window.location.href = "/login"
          }}
        >
          Logout
        </button>

      </div>

    </div>

  )

}