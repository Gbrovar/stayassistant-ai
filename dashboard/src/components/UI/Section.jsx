export default function Section({ title, children }) {

  return (

    <section className="section" style={{ marginBottom: 32 }}>

      <h2 className="section-title">{title}</h2>

      <div className="section-content" style={{ marginTop: 16 }}>
        {children}
      </div>

    </section>

  )

}