export default function RevenueCard({ kpis, upgrade }) {

  const usagePct = kpis?.usage_pct || 0
  const messages = kpis?.messages || 0

  // 💰 estimación simple (alineada con overview)
  const estimatedSavings = messages * 5

  // 💰 oportunidad futura (clave para monetización)
  const potentialRevenue = Math.round(estimatedSavings * 2.5)

  const isHighUsage = usagePct > 0.7

  return (
    <div className="card">
      <h3>Revenue Insights</h3>

      <div className="grid grid-2">

        <div>
          <p className="text-muted">Revenue</p>
          <strong>€{kpis.revenue}</strong>
        </div>

        <div>
          <p className="text-muted">Cost</p>
          <strong>€{kpis.cost}</strong>
        </div>

        <div>
          <p className="text-muted">Profit</p>
          <strong>€{kpis.profit}</strong>
        </div>

        <div>
          <p className="text-muted">Usage</p>
          <strong>{Math.round(usagePct * 100)}%</strong>
        </div>

      </div>

      {/* 💰 NUEVO BLOQUE: VALOR REAL */}
      <div style={{ marginTop: 20 }}>

        <div className="card card-soft" style={{ marginBottom: 12 }}>
          <p className="text-muted">Estimated savings</p>
          <strong>€{estimatedSavings}</strong>
        </div>

        <div className="card card-soft">
          <p className="text-muted">Potential monthly impact</p>
          <strong>€{potentialRevenue}</strong>
        </div>

      </div>

      {/* 🧠 MENSAJE DINÁMICO */}
      <div style={{ marginTop: 16 }}>

        {messages === 0 && (
          <p className="text-muted">
            Start using your AI assistant to generate value and save time
          </p>
        )}

        {messages > 0 && !isHighUsage && (
          <p className="text-muted">
            Your assistant is already saving time and improving guest experience
          </p>
        )}

        {isHighUsage && (
          <p style={{ color: "#f59e0b", fontWeight: 500 }}>
            You're handling a high volume of guest requests. Upgrading can unlock more value.
          </p>
        )}

      </div>

      {/* 🚨 CTA SOLO CUANDO IMPORTA */}
      {isHighUsage && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = "/dashboard/billing"}
          >
            Unlock more revenue
          </button>
        </div>
      )}

    </div>
  )
}